import robotsParserModule from "npm:robots-parser@3.0.1";
import { missionDate } from "../waouh-mission-domain.ts";
import { sha256Hex } from "../waouh-tel/crypto.ts";
import { collectionSources, extractNotices, sourceKeyFor } from "./sources.ts";

const robotsParser = robotsParserModule as unknown as (
  url: string, content: string,
) => { isAllowed: (url: string, userAgent: string) => boolean | undefined };
const agent = "WAOUHBot/1.0 (+https://bot.bj/)";
const maxBytes = 1_200_000;

class CollectionError extends Error {
  constructor(readonly reason: string, readonly retryable = false) {
    super(reason);
  }
}

async function readBounded(response: Response) {
  if (Number(response.headers.get("content-length")) > maxBytes || !response.body) {
    await response.body?.cancel();
    throw new CollectionError("source_body_unavailable");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let output = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return output + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new CollectionError("source_body_too_large");
      output += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

function request(url: string, headers: HeadersInit = {}) {
  return fetch(url, {
    headers: { "user-agent": agent, ...headers },
    redirect: "manual",
    signal: AbortSignal.timeout(9_000),
  });
}

async function respectRobots(url: string) {
  const robotsUrl = new URL("/robots.txt", url).href;
  const response = await request(robotsUrl);
  if (response.status === 404 || response.status === 410) {
    await response.body?.cancel();
    return;
  }
  if (response.status === 429 || response.status >= 500) {
    await response.body?.cancel();
    throw new CollectionError("source_robots_temporarily_unavailable", true);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new CollectionError("source_robots_unavailable");
  }
  const robots = robotsParser(robotsUrl, await readBounded(response));
  if (robots.isAllowed(url, "WAOUHBot") === false) throw new CollectionError("source_robots_disallowed");
}

type Db = {
  from: (name: string) => any;
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{data: any; error: unknown}>;
};
type Job = {id: string; lease_token: string; target_id: string; max_items: number};
type Report = {
  status: "succeeded" | "partial" | "empty" | "blocked" | "failed";
  reason?: string;
  retryable?: boolean;
  received?: number;
  qualified?: number;
  inserted?: number;
  updated?: number;
  unchanged?: number;
};

async function rpc(db: Db, name: string, args: Record<string, unknown> = {}) {
  const {data, error} = await db.rpc(name, args);
  if (error) throw new CollectionError(name + "_failed", true);
  return data;
}

async function processFeed(db: Db, job: Job): Promise<Report> {
  const { data: target, error } = await db.from("waouh_collection_targets")
    .select("enabled,url,etag,last_modified").eq("id", job.target_id).maybeSingle();
  if (error) throw new CollectionError("target_read_failed", true);
  const key = target?.enabled ? sourceKeyFor(target.url) : undefined;
  if (!key) return {status: "blocked", reason: "source_not_approved"};
  const source = collectionSources[key];
  await respectRobots(source.url);
  const headers: Record<string, string> = { accept: "text/html" };
  if (target.etag) headers["if-none-match"] = target.etag;
  if (target.last_modified) headers["if-modified-since"] = target.last_modified;
  const response = await request(source.url, headers);
  if (response.status === 304) return {status: "empty", reason: "http_not_modified"};
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 429 || response.status >= 500) throw new CollectionError("source_http_retry", true);
    return {status: "blocked", reason: "source_http_" + response.status};
  }
  if (!response.headers.get("content-type")?.includes("text/html")) {
    await response.body?.cancel();
    return {status: "blocked", reason: "source_media_invalid"};
  }

  const extracted = extractNotices(await readBounded(response), source);
  if (!extracted.candidates || !extracted.notices.length) {
    return {status: "failed", reason: "source_format_changed", received: extracted.candidates};
  }
  const active = extracted.notices.filter(item => (missionDate(item.deadline) ?? 0) > Date.now())
    .sort((a,b) => missionDate(a.deadline)! - missionDate(b.deadline)!).slice(0, job.max_items);
  const report = {received: extracted.candidates, qualified: active.length, inserted: 0, updated: 0, unchanged: 0};

  for (const item of active) {
    const row = {
      source_key: key,
      source_external_id: item.id,
      source_url: item.url,
      product_name: item.title,
      category: source.category,
      country_code: source.country,
      intent: "ANNOUNCE",
      actor_type: "announcer",
      actor_name: source.organization,
      evidence: {
        offer_kind: "announcement",
        organization: source.organization,
        deadline: item.deadline,
        availability_confirmed: false,
      },
      expires_at: new Date(missionDate(item.deadline)!).toISOString(),
      confidence: 1,
      trust_score: 95,
    };
    try {
      const outcome: unknown = await rpc(db, "waouh_collection_publish_official", {
        p_job: job.id, p_token: job.lease_token, p_hash: await sha256Hex(JSON.stringify(row)), p_row: row,
      });
      if (outcome === "inserted" || outcome === "updated" || outcome === "unchanged") report[outcome]++;
      else throw new CollectionError("source_write_unconfirmed", true);
    } catch (error) {
      if (report.inserted + report.updated + report.unchanged) {
        return {...report, status: "partial", reason: "source_write_incomplete"};
      }
      throw error;
    }
  }

  // Advance HTTP validators only after all selected records have been stored.
  const validators = await db.from("waouh_collection_targets").update({
    etag: response.headers.get("etag"), last_modified: response.headers.get("last-modified"),
  }).eq("id", job.target_id);
  if (validators.error) return {...report, status: "partial", reason: "source_validators_write_failed"};
  return {...report, status: report.inserted + report.updated > 0 ? "succeeded" : "empty",
    reason: active.length ? undefined : "no_current_notices"};
}

export async function runCollectionTick(db: Db) {
  const scheduled = await rpc(db, "waouh_collection_schedule", {p_handler: "feed"});
  let processed = 0;
  const outcomes: Record<string, number> = {};
  // One request per minute, up to two jobs. No inline jobs are taken over.
  for (let index = 0; index < 2; index++) {
    const job = await rpc(db, "waouh_collection_claim_feed") as Job | null;
    if (!job) break;
    let report: Report;
    try {
      report = await processFeed(db, job);
    } catch (error) {
      report = error instanceof CollectionError
        ? {status: error.retryable ? "failed" : "blocked", reason: error.reason, retryable: error.retryable}
        : {status: "failed", reason: "source_request_failed", retryable: true};
    }
    if (!await rpc(db, "waouh_collection_finish", {
      p_job: job.id, p_token: job.lease_token, p_report: report,
    })) throw new CollectionError("collection_lease_lost");
    processed++;
    outcomes[report.status] = (outcomes[report.status] || 0) + 1;
  }
  await rpc(db, "waouh_collection_heartbeat", {p_data: {scheduled, processed, outcomes}});
  return {scheduled, processed, outcomes};
}
