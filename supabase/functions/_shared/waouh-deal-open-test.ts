// deno-lint-ignore-file no-explicit-any -- base simulée.
// Tests de l'ouverture commune de discussion (Lot 1), sur une base simulée.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeOffer, openBuyerDeal } from "./waouh-deal-open.ts";

const ART = "3f2c1b0a-0000-4000-8000-00000000a001";
const BUYER = "b0000000-0000-4000-8000-000000000001";
const SELLER = "5e000000-0000-4000-8000-000000000002";

type Row = Record<string, any>;

/** Mini client Supabase en mémoire : assez pour le chemin d'ouverture. */
function fakeDb(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = { waouh_chat_threads: [], waouh_negotiations: [], waouh_interests: [], ...seed };
  const calls: string[] = [];
  function query(table: string) {
    let rows = [...(tables[table] ||= [])];
    let pendingInsert: Row | null = null;
    let pendingUpdate: Row | null = null;
    const api: any = {
      select: () => api,
      eq: (col: string, val: unknown) => { rows = rows.filter((r) => r[col] === val); return api; },
      in: (col: string, vals: unknown[]) => { rows = rows.filter((r) => vals.includes(r[col])); return api; },
      not: () => api,
      or: () => api,
      is: () => api,
      order: () => api,
      limit: () => api,
      insert: (row: Row) => { pendingInsert = { id: crypto.randomUUID(), ...row }; tables[table].push(pendingInsert); calls.push(`insert:${table}`); return api; },
      upsert: (row: Row) => { tables[table].push(row); calls.push(`upsert:${table}`); return Promise.resolve({ error: null }); },
      update: (patch: Row) => { pendingUpdate = patch; calls.push(`update:${table}`); return api; },
      maybeSingle: () => Promise.resolve({ data: pendingInsert ?? rows[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: pendingInsert ?? rows[0] ?? null, error: null }),
      then: (resolve: (v: any) => void) => {
        if (pendingUpdate) for (const r of rows) Object.assign(r, pendingUpdate);
        resolve({ data: rows, error: null });
      },
    };
    return api;
  }
  return {
    tables,
    calls,
    from: (t: string) => query(t),
    rpc: () => Promise.resolve({ data: null, error: null }),
  };
}

function seed(extra: Record<string, Row[]> = {}) {
  return fakeDb({
    waouh_articles: [{ id: ART, seller_id: SELLER, title: "Chaussures de sport", price: 2500, status: "active", photos: [] }],
    waouh_users: [
      { id: BUYER, auth_user_id: "auth-b", phone_number: null, web_session_id: "s1" },
      { id: SELLER, auth_user_id: "auth-s", phone_number: "22990000000", web_session_id: null },
    ],
    ...extra,
  });
}

const originalFetch = globalThis.fetch;
function stubFetch() {
  const sent: any[] = [];
  globalThis.fetch = ((_url: string, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body ?? "{}")));
    return Promise.resolve(new Response("{}"));
  }) as typeof fetch;
  return sent;
}

Deno.test("normalizeOffer", () => {
  assertEquals(normalizeOffer(null), null);
  assertEquals(normalizeOffer(""), null);
  assertEquals(normalizeOffer("2300"), 2300);
  assertEquals(normalizeOffer(-5), "invalid");
  assertEquals(normalizeOffer("abc"), "invalid");
});

Deno.test("ouverture : fil + négociation créés, thread_id et negotiation_id renvoyés", async () => {
  const sent = stubFetch();
  try {
    const sb = seed();
    const r = await openBuyerDeal({
      sb, articleId: ART, buyerUserId: BUYER, source: "test", offer: 2300,
      supabaseUrl: "http://x", serviceRole: "k", notifySeller: "on_create",
    });
    assertEquals(r.ok, true);
    assertEquals(typeof r.threadId, "string");
    assertEquals(typeof r.negotiationId, "string");
    assertEquals(r.created, true);
    assertEquals(r.offerPrice, 2300);
    const neg = sb.tables.waouh_negotiations[0];
    assertEquals([neg.state, neg.last_actor, neg.last_offer_price], ["proposed", "buyer", 2300]);
    assertEquals(sent.length, 1, "vendeur notifié une fois");
    assertEquals(sent[0].kind, "new_buyer");
    assertEquals(sent[0].actions.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("reprise : négociation existante réutilisée, vendeur non re-notifié (on_create)", async () => {
  const sent = stubFetch();
  try {
    const sb = seed();
    const first = await openBuyerDeal({ sb, articleId: ART, buyerUserId: BUYER, source: "t", offer: 2300, supabaseUrl: "x", serviceRole: "k", notifySeller: "on_create" });
    const again = await openBuyerDeal({ sb, articleId: ART, buyerUserId: BUYER, source: "t", offer: 2100, supabaseUrl: "x", serviceRole: "k", notifySeller: "on_create" });
    assertEquals(again.threadId, first.threadId);
    assertEquals(again.negotiationId, first.negotiationId);
    assertEquals(again.created, false);
    assertEquals(again.lastOfferPrice, 2300);
    assertEquals(sb.tables.waouh_negotiations.length, 1);
    assertEquals(sent.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("« Proposer un prix » : fil ouvert sans offre au prix affiché", async () => {
  const sent = stubFetch();
  try {
    const sb = seed();
    const r = await openBuyerDeal({ sb, articleId: ART, buyerUserId: BUYER, source: "t", supabaseUrl: "x", serviceRole: "k", notifySeller: "on_create", openNegotiation: false });
    assertEquals(r.ok, true);
    assertEquals(r.negotiationId, null);
    assertEquals(sb.tables.waouh_negotiations.length, 0);
    assertEquals(sent.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("refus : propre article, article vendu, offre invalide, article absent", async () => {
  const sb = seed();
  assertEquals((await openBuyerDeal({ sb, articleId: ART, buyerUserId: SELLER, source: "t", supabaseUrl: "x", serviceRole: "k" })).code, "self");
  assertEquals((await openBuyerDeal({ sb, articleId: ART, buyerUserId: BUYER, source: "t", offer: -1, supabaseUrl: "x", serviceRole: "k" })).code, "invalid_offer");
  assertEquals((await openBuyerDeal({ sb, articleId: "absent", buyerUserId: BUYER, source: "t", supabaseUrl: "x", serviceRole: "k" })).code, "article_not_found");
  const sold = seed({ waouh_articles: [{ id: ART, seller_id: SELLER, title: "X", price: 1, status: "sold" }] });
  assertEquals((await openBuyerDeal({ sb: sold, articleId: ART, buyerUserId: BUYER, source: "t", supabaseUrl: "x", serviceRole: "k", rejectUnavailable: true })).code, "article_unavailable");
});