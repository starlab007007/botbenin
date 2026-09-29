// deno-lint-ignore-file no-explicit-any -- base simulée.
// E10 — acheteurs évincés : négociations fermées, acheteurs prévenus, boutons périmés retirés, reprise.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { closeCompetingNegotiations, expireDecisionButtons, notifyArticleReopened, type EvictMessage } from "./waouh-evict.ts";

type Row = Record<string, any>;
const ART = "3f2c1b0a-0000-4000-8000-00000000a001";
const WIN = "a0000000-0000-4000-8000-000000000001", LOSE1 = "a0000000-0000-4000-8000-000000000002", LOSE2 = "a0000000-0000-4000-8000-000000000003";

/** Mini client Supabase en mémoire (select/eq/in/neq/update/insert). */
function fakeDb(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = { waouh_negotiations: [], waouh_chat_threads: [], waouh_messages: [], waouh_articles: [], ...seed };
  function query(table: string) {
    let rows = [...(tables[table] ||= [])];
    let patch: Row | null = null;
    const api: any = {
      select: () => api,
      eq: (c: string, v: unknown) => { rows = rows.filter((r) => r[c] === v); return api; },
      neq: (c: string, v: unknown) => { rows = rows.filter((r) => r[c] !== v); return api; },
      in: (c: string, vs: unknown[]) => { rows = rows.filter((r) => vs.includes(r[c])); return api; },
      limit: () => api,
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      update: (p: Row) => { patch = p; return api; },
      insert: (r: Row) => { tables[table].push({ id: crypto.randomUUID(), ...r }); return Promise.resolve({ error: null }); },
      then: (resolve: (v: any) => void) => {
        if (patch) { for (const r of rows) Object.assign(r, patch); return resolve({ data: rows, error: null }); }
        return resolve({ data: rows, error: null });
      },
    };
    return api;
  }
  return { tables, from: (t: string) => query(t) };
}

function scene() {
  return fakeDb({
    waouh_negotiations: [
      { id: WIN, article_id: ART, thread_id: "t-win", buyer_user_id: "b-win", state: "accepted", meta: {} },
      { id: LOSE1, article_id: ART, thread_id: "t-1", buyer_user_id: "b-1", state: "countered", meta: { k: 1 } },
      { id: LOSE2, article_id: ART, thread_id: "t-2", buyer_user_id: "b-2", state: "proposed", meta: {} },
      { id: "autre", article_id: "autre-article", thread_id: "t-x", buyer_user_id: "b-x", state: "proposed", meta: {} },
    ],
    waouh_chat_threads: [{ id: "t-win", status: "accepted" }, { id: "t-1", status: "negotiating" }, { id: "t-2", status: "negotiating" }, { id: "t-x", status: "negotiating" }],
    waouh_messages: [
      { id: "m1", thread_id: "t-1", direction: "out", meta: { actions: [{ id: `accepter:${LOSE1}`, label: "Accepter" }] } },
      { id: "m2", thread_id: "t-1", direction: "out", meta: { actions: [] } },
      { id: "m3", thread_id: "t-win", direction: "out", meta: { actions: [{ id: "x", label: "Confirmer" }] } },
    ],
    waouh_articles: [{ id: ART, title: "Vélo", price: 100000, status: "active" }],
  });
}

Deno.test("E10 : les négociations concurrentes sont fermées, l'accord gagnant et les autres articles intacts", async () => {
  const db = scene(); const sent: EvictMessage[] = [];
  const r = await closeCompetingNegotiations(db, { articleId: ART, winnerNegotiationId: WIN }, async (m) => { sent.push(m); });
  assertEquals(r.closed, 2);
  const byId = (id: string) => db.tables.waouh_negotiations.find((n) => n.id === id)!;
  assertEquals(byId(LOSE1).state, "closed");
  assertEquals(byId(LOSE2).state, "closed");
  assertEquals(byId(LOSE1).meta.closed_reason, "article_reserved");
  assertEquals(byId(LOSE1).meta.k, 1, "les métadonnées existantes sont conservées");
  assertEquals(byId(WIN).state, "accepted");
  assertEquals(byId("autre").state, "proposed");
  assertEquals(db.tables.waouh_chat_threads.find((t) => t.id === "t-1")!.status, "waiting_availability");
  assertEquals(db.tables.waouh_chat_threads.find((t) => t.id === "t-win")!.status, "accepted");
  assertEquals(db.tables.waouh_chat_threads.find((t) => t.id === "t-x")!.status, "negotiating");
});

Deno.test("E10 : chaque acheteur évincé est prévenu une fois, avec le message « Article réservé »", async () => {
  const db = scene(); const sent: EvictMessage[] = [];
  const r = await closeCompetingNegotiations(db, { articleId: ART, winnerNegotiationId: WIN }, async (m) => { sent.push(m); });
  assertEquals(r.notified, 2);
  assertEquals(sent.map((m) => m.userId).sort(), ["b-1", "b-2"]);
  assert(sent.every((m) => /Article réservé/.test(m.text) && /prévenu s'il revient/.test(m.text)));
  assertEquals(new Set(sent.map((m) => m.dedupeKey)).size, 2);
});

Deno.test("E10 : les boutons périmés du fil évincé sont retirés, pas ceux du fil gagnant", async () => {
  const db = scene();
  const r = await closeCompetingNegotiations(db, { articleId: ART, winnerNegotiationId: WIN }, async () => {});
  assertEquals(r.buttonsExpired, 1);
  const m1 = db.tables.waouh_messages.find((m) => m.id === "m1")!;
  assertEquals(m1.meta.actions, []);
  assertEquals(m1.meta.actions_expired, true);
  assertEquals(db.tables.waouh_messages.find((m) => m.id === "m3")!.meta.actions.length, 1);
});

Deno.test("E10 : une notification qui échoue ne bloque pas la clôture", async () => {
  const db = scene();
  const r = await closeCompetingNegotiations(db, { articleId: ART, winnerNegotiationId: WIN }, async () => { throw new Error("hors service"); });
  assertEquals(r.closed, 2);
  assertEquals(r.notified, 0);
});

Deno.test("E10 : sans concurrent, rien n'est modifié", async () => {
  const db = fakeDb({ waouh_negotiations: [{ id: WIN, article_id: ART, thread_id: "t-win", buyer_user_id: "b", state: "accepted", meta: {} }] });
  assertEquals(await closeCompetingNegotiations(db, { articleId: ART, winnerNegotiationId: WIN }, async () => {}), { closed: 0, notified: 0, buttonsExpired: 0 });
});

Deno.test("expireDecisionButtons : ne touche que les messages sortants qui portent des boutons", async () => {
  const db = scene();
  assertEquals(await expireDecisionButtons(db, "t-1"), 1);
  assertEquals(await expireDecisionButtons(db, "t-1"), 0, "idempotent");
});

Deno.test("reprise : l'article revient à la vente → acheteurs évincés prévenus avec boutons, une seule fois", async () => {
  const db = scene(); const sent: EvictMessage[] = [];
  await closeCompetingNegotiations(db, { articleId: ART, winnerNegotiationId: WIN }, async () => {});
  const first = await notifyArticleReopened(db, { articleId: ART }, async (m) => { sent.push(m); });
  assertEquals(first.notified, 2);
  assert(sent.every((m) => /De nouveau disponible/.test(m.text)));
  assertEquals(sent[0].actions.map((a) => a.id.split(":")[0]), ["je-veux", "proposer-prix", "poser-question"]);
  assertEquals(db.tables.waouh_chat_threads.find((t) => t.id === "t-1")!.status, "active");
  const second = await notifyArticleReopened(db, { articleId: ART }, async (m) => { sent.push(m); });
  assertEquals(second.notified, 0, "jamais deux fois");
});

Deno.test("reprise : article encore réservé ou vendu → aucune notification", async () => {
  for (const status of ["reserved", "sold"]) {
    const db = scene();
    db.tables.waouh_articles[0].status = status;
    await closeCompetingNegotiations(db, { articleId: ART, winnerNegotiationId: WIN }, async () => {});
    assertEquals((await notifyArticleReopened(db, { articleId: ART }, async () => {})).notified, 0, status);
  }
});
