import { load } from "npm:cheerio@1.2.0/slim";
import { redactPublicContacts } from "../waouh-signal-fabric.ts";

const government = "https://www.gouv.bj";
const centralBank = "https://www.bceao.int";
const developmentBank = "https://www.boad.org";
export const collectionSources = {
  "benin_government_jobs": {
    url: government + "/opportunites/offres-emploi/",
    category: "Emploi et recrutement",
    organization: "Gouvernement du Bénin",
    country: "BJ",
    adapter: "government",
    zoneOffset: "+01:00",
  },
  "benin_government_procurement": {
    url: government + "/opportunites/marches-publics/",
    category: "Marchés publics",
    organization: "Gouvernement du Bénin",
    country: "BJ",
    adapter: "government",
    zoneOffset: "+01:00",
  },
  "waemu_boad_procurement": {
    url: developmentBank + "/fr/opportunites/appels-doffre",
    category: "Marchés publics",
    organization: "BOAD",
    country: "TG",
    adapter: "boad",
    zoneOffset: "+00:00",
  },
  "waemu_bceao_procurement": {
    url: centralBank + "/fr/appels-offres/appels-offres-marches-publics-achats",
    category: "Marchés publics",
    organization: "BCEAO",
    country: "SN",
    adapter: "bceao",
    zoneOffset: "+00:00",
  },
} as const;

export type CollectionSourceKey = keyof typeof collectionSources;
export type CollectionSource = (typeof collectionSources)[CollectionSourceKey];
export type VerifiedNotice = {
  id: string;
  url: string;
  title: string;
  deadline: string;
};

const months = new Map([
  ["jan", 1], ["janvier", 1], ["january", 1],
  ["feb", 2], ["fev", 2], ["fevrier", 2], ["february", 2],
  ["mar", 3], ["mars", 3], ["march", 3],
  ["apr", 4], ["avr", 4], ["avril", 4], ["april", 4],
  ["mai", 5], ["may", 5],
  ["jun", 6], ["juin", 6], ["june", 6],
  ["jul", 7], ["juil", 7], ["juillet", 7], ["july", 7],
  ["aug", 8], ["aout", 8], ["august", 8],
  ["sep", 9], ["sept", 9], ["septembre", 9], ["september", 9],
  ["oct", 10], ["octobre", 10], ["october", 10],
  ["nov", 11], ["novembre", 11], ["november", 11],
  ["dec", 12], ["decembre", 12], ["december", 12],
]);

export function noticeDeadline(text: string, zoneOffset: string): string | null {
  const match = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .match(/^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})(?:\s+(?:a\s+)?(\d{1,2})\s*[:h]\s*(\d{2}))?$/);
  if (!match) return null;
  const month = months.get(match[2]);
  if (!month) return null;
  const day = String(match[1]).padStart(2, "0");
  const date = `${match[3]}-${String(month).padStart(2, "0")}-${day}`;
  const calendar = Date.parse(date + "T00:00:00Z");
  if (!Number.isFinite(calendar) || new Date(calendar).toISOString().slice(0, 10) !== date) return null;
  // A date without a stated time is kept as a date. Readers apply local end-of-day.
  if (match[4] === undefined) return date;
  if (Number(match[4]) > 23 || Number(match[5]) > 59) return null;
  return new Date(date + "T" + match[4].padStart(2, "0") + ":" + match[5] + ":00" + zoneOffset).toISOString();
}

export function sourceKeyFor(url: string): CollectionSourceKey | undefined {
  return (Object.keys(collectionSources) as CollectionSourceKey[]).find(key => collectionSources[key].url === url);
}

type BoadIndexRow = {
  id?: number;
  link?: string;
  title?: string;
  acf?: { end_at?: string | null; presentation?: Record<string, unknown> };
  project_status?: Array<{ slug?: string }>;
};

function boadDeadline(date: string, presentation: Record<string, unknown> | undefined) {
  const closing = /date limite[^:\r\n]{0,130}:\s*(\d{1,2}\s+[\p{L}]+\s+\d{4})\s+[àa]\s+(\d{1,2})\s*[h:]\s*(\d{2})[^\r\n]{0,30}?\b(?:GMT|UTC)(?:\s*([+-])\s*(\d{1,2})(?::(\d{2}))?)?/giu;
  const possible = new Set<string>();
  for (const value of Object.values(presentation ?? {})) {
    if (typeof value !== "string") continue;
    const text = load(value).text();
    for (const match of text.matchAll(closing)) {
      const [_, writtenDate, hour, minutes, sign, offsetHour, offsetMinutes] = match;
      const advertisedDate = noticeDeadline(writtenDate, "+00:00");
      if (advertisedDate !== date || Number(offsetHour ?? 0) > 14 || Number(offsetMinutes ?? 0) > 59) continue;
      const offset = `${sign ?? "+"}${(offsetHour ?? "0").padStart(2, "0")}:${offsetMinutes ?? "00"}`;
      const timestamp = noticeDeadline(`${writtenDate} ${hour}:${minutes}`, offset);
      if (timestamp) possible.add(timestamp);
    }
  }
  return possible.size === 1 ? [...possible][0] : date;
}

function extractBoadNotices(html: string, source: CollectionSource) {
  const $ = load(html);
  const payload = $("[data-page]").first().attr("data-page");
  if (!payload) return {candidates: 0, notices: []};
  const data: unknown = JSON.parse(payload)?.props?.tenders?.data;
  if (!Array.isArray(data)) return {candidates: 0, notices: []};
  const notices: VerifiedNotice[] = [];
  for (const row of data as BoadIndexRow[]) {
    if (!Number.isSafeInteger(row?.id) || !row.link || !row.title ||
        !row.project_status?.some(status => ["starting", "tender_notice"].includes(status.slug ?? ""))) continue;
    const parsed = row.acf?.end_at?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!parsed) continue;
    const date = `${parsed[3]}-${parsed[2]}-${parsed[1]}`;
    const time = Date.parse(date + "T00:00:00Z");
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) continue;
    let url: URL;
    try { url = new URL(row.link, source.url); } catch { continue; }
    if (url.origin !== new URL(source.url).origin || url.username || url.password ||
        !/^\/fr\/opportunites\/appels-doffre\/[^/]+\/?$/.test(url.pathname)) continue;
    url.search = "";
    url.hash = "";
    const title = redactPublicContacts(load(row.title).text().replace(/\s+/g, " ").trim()).slice(0, 300);
    if (title.length < 10) continue;
    notices.push({id: String(row.id), url: url.href, title, deadline: boadDeadline(date, row.acf?.presentation)});
  }
  return {candidates: data.length, notices};
}

// This returns facts from the publisher's own dated index. No text, contact,
// general site image or inferred availability from third parties is imported.
export function extractNotices(html: string, source: CollectionSource) {
  if (source.adapter === "boad") return extractBoadNotices(html, source);
  const $ = load(html);
  const index = new URL(source.url);
  const result = new Map<string, VerifiedNotice>();
  const selector = source.adapter === "government" ? "article h3 a[href]" : "a[href] .descFile";
  let candidates = 0;
  for (const node of $(selector).toArray()) {
    const element = $(node);
    const link = source.adapter === "government" ? element : element.closest("a[href]");
    const href = link.attr("href");
    if (!href) continue;
    let url: URL;
    try { url = new URL(href, index); } catch { continue; }
    if (url.origin !== index.origin || url.username || url.password) continue;
    const id = source.adapter === "government"
      ? /^\/opportunite\/(\d+)\/[^/]+\/?$/.exec(url.pathname)?.[1]
      : /^\/fr\/appels-offres\/[^/]+\/?$/.test(url.pathname) ? url.pathname.replace(/\/$/, "") : null;
    if (!id) continue;
    candidates++;
    const deadlineElement = source.adapter === "government"
      ? element.closest("article").find("span").filter((_, span) => /^cl[oô]ture\s*:/i.test($(span).text().trim())).first().next()
      : element.find("time").first();
    const titleNode = source.adapter === "government" ? element : element.find(".ttr").first();
    const title = redactPublicContacts((titleNode.text() || "").replace(/\s+/g, " ").trim()).slice(0, 300);
    const deadline = noticeDeadline(deadlineElement.text().replace(/\s+/g, " ").trim(), source.zoneOffset);
    if (title.length < 10 || !deadline) continue;
    url.search = "";
    url.hash = "";
    result.set(id, { id, url: url.href, title, deadline });
  }
  return { candidates, notices: [...result.values()] };
}
