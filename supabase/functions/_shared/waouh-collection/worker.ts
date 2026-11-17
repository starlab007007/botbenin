import { catalogJson, facebookCommercialPosts, facebookGroup, schemaOrgCatalog, trustedHttps,
  type CollectedCommerce, type SourcePermission } from "./commerce.ts";
import { getRadarApiKey } from "../radar-api-config.ts";
import robotsParserModule from "npm:robots-parser@3.0.1";
import { missionDate } from "../waouh-mission-domain.ts";
import { sha256Hex } from "../waouh-tel/crypto.ts";
import { collectionSources, extractNotices, sourceKeyFor, type CollectionSource, type VerifiedNotice } from "./sources.ts";

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
type Handler = "feed" | "site" | "apify";
type Job = {id: string; lease_token: string; target_id: string; max_items: number; handler: Handler};
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

function publicationCutoff(item: VerifiedNotice, source: CollectionSource) {
  if (item.deadline.length === 10) {
    // The source did not state an hour. Avoid keeping a notice advertised as
    // open through the last day when it may close first thing that morning.
    return Date.parse(item.deadline + "T00:00:00" + source.zoneOffset);
  }
  return missionDate(item.deadline) ?? 0;
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
  const active = extracted.notices.filter(item => publicationCutoff(item, source) > Date.now())
    .sort((a,b) => publicationCutoff(a, source) - publicationCutoff(b, source)).slice(0, job.max_items);
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
      expires_at: new Date(publicationCutoff(item, source)).toISOString(),
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

type RadarSource = {identifier:string; type:string; config:SourcePermission | null};
const supportedHandlers:Handler[] = ["feed","site","apify"];

async function approvedRadarSource(db: Db, job: Job): Promise<RadarSource | null> {
  const {data:target,error} = await db.from("waouh_collection_targets")
    .select("radar_source_id,enabled").eq("id",job.target_id).maybeSingle();
  if (error) throw new CollectionError("target_read_failed", true);
  if (!target?.enabled || !target.radar_source_id) return null;
  const { data: source, error: sourceError } = await db.from("waouh_radar_sources")
    .select("identifier,type,config").eq("id",target.radar_source_id).eq("active",true).maybeSingle();
  if (sourceError) throw new CollectionError("source_read_failed",true);
  return source?.config?.automation_authorized === true && source.config.attribution ? source : null;
}

async function fetchCatalog(source:RadarSource, permission:SourcePermission):Promise<CollectedCommerce[]> {
  const url = trustedHttps(permission.canonical_url ?? source.identifier);
  const original = trustedHttps(source.identifier);
  const hostSettings = (Deno.env.get("WAOUH_COLLECTION_SITE_HOSTS") ?? "").split(",").map(v=>v.trim().toLowerCase());
  const known = new Set(["bot.bj","www.bot.bj","bj.coinafrique.com","www.coinafrique.com","martistore.click",...hostSettings.filter(Boolean)]);
  if (!url || !original || url.origin !== original.origin || !known.has(url.hostname))
    throw new CollectionError("source_host_not_allowed");
  await respectRobots(url.href);
  const format = permission.collection_format ?? "schema_org";
  const json = format === "catalog_json" || format === "directory";
  const response = await request(url.href, {accept:json ? "application/json" : "text/html"});
  if (!response.ok) {
    await response.body?.cancel();
    throw new CollectionError("source_http_" + response.status,response.status===429||response.status>=500);
  }
  const type = response.headers.get("content-type") ?? "";
  if (json ? !type.includes("json") : !type.includes("text/html")) {
    await response.body?.cancel();
    throw new CollectionError("source_media_invalid");
  }
  const body = await readBounded(response);
  if (!json) return schemaOrgCatalog(body,url,permission);
  const payload = JSON.parse(body);
  if (!Array.isArray(payload?.items)) throw new CollectionError("source_format_changed");
  return catalogJson(payload,url,permission,format==="directory");
}

async function fetchApify(db:Db, job:Job, source:RadarSource, permission:SourcePermission) {
  const group = source.type === "fb_group" && facebookGroup(permission.canonical_url ?? source.identifier);
  if (!group) throw new CollectionError("facebook_scope_not_supported");
  const {data:policy,error} = await db.from("waouh_collection_policies")
    .select("estimated_daily_cost_limit,estimated_call_cost,cost_currency")
    .eq("provider","apify").maybeSingle();
  if(error) throw new CollectionError("provider_policy_read_failed",true);
  const cap = Number(policy?.estimated_call_cost);
  if (policy?.estimated_daily_cost_limit == null || policy.cost_currency !== "USD" ||
      !Number.isFinite(cap) || cap <= 0) throw new CollectionError("provider_budget_not_configured");
  const key = await getRadarApiKey(db,"apify","APIFY_TOKEN");
  if (!key.ok || !key.key || !key.configId) throw new CollectionError("provider_key_missing");
  if (!await rpc(db,"waouh_collection_reserve",{p_job:job.id,p_token:job.lease_token,p_config:key.configId,p_delta:1}))
    throw new CollectionError("provider_quota_exhausted");
  const url = new URL("https://api.apify.com/v2/acts/apify~facebook-groups-scraper/run-sync-get-dataset-items");
  url.searchParams.set("timeout","35");
  url.searchParams.set("limit",String(Math.min(job.max_items,8)));
  url.searchParams.set("maxTotalChargeUsd",String(cap));
  const response = await fetch(url,{method:"POST",redirect:"error",
    headers:{Authorization:`Bearer ${key.key}`,"Content-Type":"application/json"},
    body:JSON.stringify({startUrls:[{url:group.href}],resultsLimit:Math.min(job.max_items,8),includeComments:false}),
    signal:AbortSignal.timeout(42_000)});
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status===429) throw new CollectionError("provider_rate_limited");
    if ([401,402,403,404].includes(response.status)) throw new CollectionError("provider_access_or_billing_blocked");
    // A timeout does not prove the Actor failed to start. Avoid replaying a paid request automatically.
    throw new CollectionError("provider_execution_unconfirmed");
  }
  return facebookCommercialPosts(JSON.parse(await readBounded(response)),group,permission);
}

async function processCommerce(db:Db,job:Job):Promise<Report> {
  const source = await approvedRadarSource(db,job);
  if (!source || !source.config) return {status:"blocked",reason:"source_permission_missing"};
  const permission = source.config;
  let candidates:CollectedCommerce[];
  try {
    candidates = job.handler==="apify" ? await fetchApify(db,job,source,permission) : await fetchCatalog(source,permission);
  } catch(error) {
    if (job.handler==="apify" && !(error instanceof CollectionError))
      return {status:"blocked",reason:"provider_execution_unconfirmed"};
    throw error;
  }
  const selected = [...new Map(candidates.map(row=>[row.source_external_id,row])).values()].slice(0,job.max_items);
  const report = {received:candidates.length,qualified:selected.length,inserted:0,updated:0,unchanged:0};
  for (const row of selected) {
    try {
      const outcome:unknown = await rpc(db,"waouh_collection_publish_catalog",{
        p_job:job.id,p_token:job.lease_token,p_hash:await sha256Hex(JSON.stringify(row)),p_row:row});
      if (outcome==="inserted" || outcome==="updated" || outcome==="unchanged") report[outcome]++;
      else throw new CollectionError("source_write_unconfirmed",true);
    } catch(error) {
      if (report.inserted+report.updated+report.unchanged || job.handler==="apify")
        return {...report,status:"partial",reason:"source_write_incomplete"};
      throw error;
    }
  }
  return {...report,status:report.inserted+report.updated>0 ? "succeeded" : "empty",
    reason:selected.length ? undefined : "no_qualified_commerce"};
}

export async function runCollectionTick(db: Db) {
  let scheduled = 0;
  for (const handler of supportedHandlers) {
    scheduled += Number(await rpc(db, "waouh_collection_schedule", {p_handler: handler}));
  }
  let processed = 0;
  const outcomes: Record<string, number> = {};
  // One request per minute, up to two jobs. No inline jobs are taken over.
  for (let index = 0; index < 2; index++) {
    const job = await rpc(db, "waouh_collection_claim_targeted", {p_handlers:supportedHandlers}) as Job | null;
    if (!job) break;
    let report: Report;
    try {
      report = job.handler === "feed" ? await processFeed(db, job) : await processCommerce(db, job);
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
