// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runNexusFollowUp } from "./waouh-nexus-followup-core.ts";
import { NEXUS_ORIGIN, stubSessionKey } from "./waouh-nexus-deal.ts";

type Row = Record<string, any>;
const SIG = "d1a00000-0000-4000-8000-000000000001";
const NOW = new Date("2026-09-30T12:00:00Z");
const ago = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

function fakeDb(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = { waouh_messages: [], waouh_chat_threads: [], waouh_articles: [], waouh_users: [], waouh_external_commerce_signals: [], waouh_entity_contacts: [], waouh_admin_module_controls: [], ...seed };
  const get = (row: Row, col: string) => col.includes("->>") ? row[col.split("->>")[0]]?.[col.split("->>")[1]] : row[col];
  const from = (t: string) => {
    let rows = [...tables[t]];
    let inserted: Row | null = null;
    const api: any = {
      select: () => api,
      eq: (c: string, v: unknown) => { rows = rows.filter((r) => get(r, c) === v); return api; },
      in: (c: string, vs: unknown[]) => { rows = rows.filter((r) => vs.includes(get(r, c))); return api; },
      gte: (c: string, v: string) => { rows = rows.filter((r) => get(r, c) >= v); return api; },
      order: (c: string, o: any) => { rows.sort((a, b) => (a[c] > b[c] ? 1 : -1) * (o?.ascending === false ? -1 : 1)); return api; },
      limit: () => api,
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      insert: (r: Row) => { inserted = { id: crypto.randomUUID(), created_at: NOW.toISOString(), ...r }; tables[t].push(inserted); return api; },
      then: (res: (v: any) => void) => res({ data: inserted ? null : rows, error: null }),
    };
    return api;
  };
  return { tables, from };
}

const msg = (thread: string, intent: string, hoursAgo: number, extra: Row = {}): Row =>
  ({ id: crypto.randomUUID(), thread_id: thread, direction: "out", created_at: ago(hoursAgo), meta: { intent, ...extra } });
const base = (): Record<string, Row[]> => ({
  waouh_chat_threads: [{ id: "t1", article_id: "a1", buyer_user_id: "buyer", seller_user_id: "stub", negotiation_id: "n1", status: "active" }],
  waouh_articles: [{ id: "a1", seller_id: "stub", origin: NEXUS_ORIGIN, price: 150000 }],
  waouh_users: [{ id: "stub", web_session_id: stubSessionKey(SIG) }, { id: "buyer", auth_user_id: "auth-b" }],
  waouh_external_commerce_signals: [{ id: SIG, intent: "SELL", actor_type: "seller", status: "active", contactability_level: "C1", entity_id: "e1", expires_at: null }],
});
const notes = (db: any, intent: string) => db.tables.waouh_messages.filter((m: Row) => m.meta?.intent === intent);

Deno.test("offre transmise depuis 25 h : une note « Relancer » avec bouton, jamais d'envoi ; pas de doublon au tick suivant", async () => {
  const db = fakeDb({ ...base(), waouh_messages: [msg("t1", "commerce_external_offer_sent", 25)] });
  const first = await runNexusFollowUp(db, { now: NOW });
  assertEquals([first.nudges, first.errors], [1, 0]);
  const note = notes(db, "commerce_avatar_nudge_due")[0];
  assert(note && note.text.includes("Toujours sans réponse"));
  assertEquals(note.meta.actions.map((a: any) => a.id), ["relancer:n1", "proposer-prix:a1"]);
  assertEquals(notes(db, "commerce_external_nudge_sent").length, 0, "l'avatar n'envoie rien au tiers");
  const second = await runNexusFollowUp(db, { now: NOW });
  assertEquals(second.nudges, 0);
  assertEquals(notes(db, "commerce_avatar_nudge_due").length, 1);
});

Deno.test("avant 24 h : rien ; à 80 h après une première note : deuxième rappel ; à 8 jours : clôture proposée une seule fois", async () => {
  let db = fakeDb({ ...base(), waouh_messages: [msg("t1", "commerce_external_offer_sent", 10)] });
  assertEquals((await runNexusFollowUp(db, { now: NOW })).nudges, 0);
  db = fakeDb({ ...base(), waouh_messages: [msg("t1", "commerce_external_offer_sent", 80), msg("t1", "commerce_avatar_nudge_due", 50)] });
  assertEquals((await runNexusFollowUp(db, { now: NOW })).nudges, 1);
  db = fakeDb({ ...base(), waouh_messages: [msg("t1", "commerce_external_offer_sent", 200), msg("t1", "commerce_avatar_nudge_due", 170), msg("t1", "commerce_avatar_nudge_due", 120)] });
  assertEquals((await runNexusFollowUp(db, { now: NOW })).expired, 1);
  assertEquals((await runNexusFollowUp(db, { now: NOW })).expired, 0);
  assert(notes(db, "commerce_avatar_expired")[0].meta.actions.length >= 1, "la clôture propose de quoi rebondir");
});

Deno.test("réponse du vendeur reçue : plus de rappel", async () => {
  const reply = { id: "r1", thread_id: "t1", direction: "in", user_id: "stub", created_at: ago(5), meta: {} };
  const db = fakeDb({ ...base(), waouh_messages: [msg("t1", "commerce_external_offer_sent", 30), reply] });
  const r = await runNexusFollowUp(db, { now: NOW });
  assertEquals([r.nudges, r.expired], [0, 0]);
});

Deno.test("veille : contact public ouvert → une note « Vendeur joignable » avec « Envoyer mon offre », une seule fois", async () => {
  const seed = { ...base(), waouh_messages: [msg("t1", "commerce_avatar_watching", 3)],
    waouh_external_commerce_signals: [{ ...base().waouh_external_commerce_signals[0], entity_id: "e1" }],
    waouh_entity_contacts: [{ entity_id: "e1", channel: "whatsapp", value_encrypted: "x", is_public_business: true, contactability_level: "C1" }] };
  const db = fakeDb(seed);
  assertEquals((await runNexusFollowUp(db, { now: NOW })).reachable, 1);
  assertEquals(notes(db, "commerce_avatar_reachable")[0].meta.actions[0].id, "envoyer-offre:n1");
  assertEquals((await runNexusFollowUp(db, { now: NOW })).reachable, 0);
});

Deno.test("veille sans contact (C0 ou aucun contact) : l'avatar attend ; après 14 jours il propose de clore", async () => {
  const c0 = { ...base(), waouh_messages: [msg("t1", "commerce_avatar_watching", 3)],
    waouh_external_commerce_signals: [{ ...base().waouh_external_commerce_signals[0], contactability_level: "C0" }] };
  const db = fakeDb(c0);
  const r = await runNexusFollowUp(db, { now: NOW });
  assertEquals([r.reachable, r.expired], [0, 0]);
  const old = fakeDb({ ...c0, waouh_messages: [msg("t1", "commerce_avatar_watching", 15 * 24 - 1)] });
  assertEquals((await runNexusFollowUp(old, { now: NOW })).expired, 1);
  assert(notes(old, "commerce_avatar_expired")[0].text.includes("Veille terminée"));
});

Deno.test("annonce disparue pendant la veille : l'acheteur est prévenu ; fil conclu : ignoré", async () => {
  const gone = fakeDb({ ...base(), waouh_messages: [msg("t1", "commerce_avatar_watching", 3)],
    waouh_external_commerce_signals: [{ ...base().waouh_external_commerce_signals[0], status: "expired" }] });
  assertEquals((await runNexusFollowUp(gone, { now: NOW })).expired, 1);
  assert(notes(gone, "commerce_avatar_expired")[0].text.includes("Annonce indisponible"));
  const done = fakeDb({ ...base(), waouh_chat_threads: [{ ...base().waouh_chat_threads[0], status: "concluded" }], waouh_messages: [msg("t1", "commerce_external_offer_sent", 100)] });
  const r = await runNexusFollowUp(done, { now: NOW });
  assertEquals([r.nudges, r.skipped], [0, 1]);
});

Deno.test("une erreur sur un fil n'arrête pas les autres", async () => {
  const seed = { ...base(), waouh_messages: [msg("t1", "commerce_external_offer_sent", 30), msg("t2", "commerce_external_offer_sent", 30)],
    waouh_chat_threads: [{ id: "t1", article_id: "a1", buyer_user_id: "buyer", seller_user_id: "stub", negotiation_id: "n1", status: "active" }, { id: "t2", article_id: "a1", buyer_user_id: "buyer", seller_user_id: "stub", negotiation_id: "n2", status: "active" }] };
  const db = fakeDb(seed);
  const realFrom = db.from;
  let calls = 0;
  (db as any).from = (t: string) => { if (t === "waouh_chat_threads" && ++calls === 1) throw new Error("panne"); return realFrom(t); };
  const r = await runNexusFollowUp(db, { now: NOW });
  assertEquals([r.errors, r.nudges], [1, 1]);
});

Deno.test("relance déjà envoyée il y a < 24 h par l'acheteur : l'avatar ne rappelle pas", async () => {
  const db = fakeDb({ ...base(), waouh_messages: [msg("t1", "commerce_external_offer_sent", 30), msg("t1", "commerce_external_nudge_sent", 2)] });
  const r = await runNexusFollowUp(db, { now: NOW });
  assertEquals(r.nudges, 0);
});
