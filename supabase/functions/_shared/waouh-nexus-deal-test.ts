// deno-lint-ignore-file no-explicit-any -- base simulée.
// Résultats Nexus externes → Deal Room : matérialisation, politique de contact, transmission.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  classifyTransmission,
  externalOfferMessage,
  materializeExternalSignal,
  NEXUS_ORIGIN,
  normalizeArticleCategory,
  parseFabricId,
  signalToArticleRow,
  signalUnavailableReason,
  stubSessionKey,
  transmissionMayBePermitted,
  transmitExternalOffer,
} from "./waouh-nexus-deal.ts";

const SIG = "d1a00000-0000-4000-8000-000000000001";
const NOW = new Date("2026-09-29T12:00:00Z");
const base = {
  id: SIG, intent: "SELL", actor_type: "seller", actor_name: "Boutique Cotonou Tech", product_name: "Samsung Galaxy A54",
  category: "Téléphones", price_min: 150000, price_max: 180000, city: "Cotonou", status: "active",
  contactability_level: "C1", raw_text: "Vente Samsung A54, appelez le +229 97 00 11 22 ou écrivez à vente@exemple.bj",
  primary_photo_url: "https://cdn.exemple.bj/a54.jpg", photo_urls: ["https://cdn.exemple.bj/a54-2.jpg", "javascript:alert(1)", "http://x/y.png"],
};

Deno.test("parseFabricId : les trois formes, rien d'autre", () => {
  assertEquals(parseFabricId(`external:${SIG}`), { kind: "external", id: SIG });
  assertEquals(parseFabricId(`ARTICLE:${SIG.toUpperCase()}`), { kind: "article", id: SIG });
  assertEquals(parseFabricId(`buyer:${SIG}`)?.kind, "buyer");
  for (const bad of ["external:pas-un-uuid", `other:${SIG}`, SIG, "", null, undefined, `external:${SIG},id.neq.0`]) assertEquals(parseFabricId(bad), null, String(bad));
});

Deno.test("catégorie : uniquement les valeurs acceptées par la contrainte de waouh_articles", () => {
  assertEquals(normalizeArticleCategory("Téléphones"), "smartphone");
  assertEquals(normalizeArticleCategory("Ordinateur portable"), "ordinateur");
  assertEquals(normalizeArticleCategory("meuble"), "meuble");
  assertEquals(normalizeArticleCategory("Services de plomberie"), "autre");
  assertEquals(normalizeArticleCategory(null), "autre");
});

Deno.test("seules les offres explicites, actives et non expirées deviennent négociables", () => {
  assertEquals(signalUnavailableReason(base, NOW), null);
  assertEquals(signalUnavailableReason({ ...base, intent: "OFFER" }, NOW), null);
  assertEquals(signalUnavailableReason({ ...base, intent: "BUY" }, NOW), "signal_not_offer");
  assertEquals(signalUnavailableReason({ ...base, intent: "RFQ" }, NOW), "signal_not_offer");
  assertEquals(signalUnavailableReason({ ...base, intent: "UNKNOWN" }, NOW), "signal_not_offer");
  assertEquals(signalUnavailableReason({ ...base, actor_type: "buyer" }, NOW), "signal_not_offer");
  assertEquals(signalUnavailableReason({ ...base, status: "expired" }, NOW), "signal_unavailable");
  assertEquals(signalUnavailableReason({ ...base, status: "blocked" }, NOW), "signal_unavailable");
  assertEquals(signalUnavailableReason({ ...base, expires_at: "2026-09-01T00:00:00Z" }, NOW), "signal_unavailable");
});

Deno.test("article dérivé : aucune coordonnée privée, photos publiques seulement, prix bas de la fourchette", () => {
  const row = signalToArticleRow(base, "seller-stub", NOW);
  assertEquals(row.seller_id, "seller-stub");
  assertEquals(row.title, "Samsung Galaxy A54");
  assertEquals(row.category, "smartphone");
  assertEquals(row.price, 150000);
  assertEquals(row.origin, NEXUS_ORIGIN);
  assert(!("origin_signal_id" in row), "la FK de origin_signal_id vise waouh_radar_signals");
  assertEquals(row.status, "active");
  assertEquals(row.contact_whatsapp, null);
  assertEquals(row.photos, ["https://cdn.exemple.bj/a54.jpg", "https://cdn.exemple.bj/a54-2.jpg", "http://x/y.png"]);
  const description = String(row.description);
  assert(!description.includes("97 00 11 22") && !description.includes("vente@exemple.bj"), description);
  assertEquals(new Date(String(row.expires_at)).getTime(), NOW.getTime() + 7 * 24 * 3600 * 1000);
});

Deno.test("article dérivé : titre de repli, prix absent = 0, condition inconnue = good", () => {
  const row = signalToArticleRow({ ...base, product_name: "", price_min: null, price_max: null, condition: "d'occasion" }, "s", NOW);
  assert(String(row.title).startsWith("Vente Samsung A54"));
  assertEquals(row.price, 0);
  assertEquals(row.condition, "good");
  assertEquals(signalToArticleRow({ ...base, product_name: "", raw_text: "" }, "s", NOW).title, "Offre externe");
});

// --- base simulée ----------------------------------------------------------------------------------
type Row = Record<string, any>;
function fakeDb(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = { waouh_users: [], waouh_articles: [], waouh_external_commerce_signals: [], ...seed };
  const counters = { insertedUsers: 0 };
  function query(table: string) {
    let rows = [...tables[table]];
    let del = false;
    let pending: Row | null = null;
    const api: any = {
      select: () => api,
      eq: (c: string, v: unknown) => { rows = rows.filter((r) => r[c] === v); return api; },
      order: (c: string, o: any) => { rows.sort((a, b) => (a[c] > b[c] ? 1 : -1) * (o?.ascending === false ? -1 : 1)); return api; },
      limit: () => api,
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      single: () => Promise.resolve(pending ? { data: pending, error: null } : { data: rows[0] ?? null, error: rows[0] ? null : { message: "none" } }),
      insert: (r: Row) => {
        pending = { id: crypto.randomUUID(), created_at: new Date(Date.now() + tables[table].length).toISOString(), ...r };
        tables[table].push(pending);
        if (table === "waouh_users") counters.insertedUsers += 1;
        return api;
      },
      delete: () => { del = true; return api; },
      then: (resolve: (v: any) => void) => {
        if (del) { const ids = new Set(rows.map((r) => r.id)); tables[table] = tables[table].filter((r) => !ids.has(r.id)); }
        return resolve({ data: rows, error: null });
      },
    };
    return api;
  }
  return { tables, counters, from: (t: string) => query(t) };
}

Deno.test("matérialisation : article + vendeur stub sans coordonnées, une seule fois par signal", async () => {
  const db = fakeDb({ waouh_external_commerce_signals: [{ ...base }] });
  const first = await materializeExternalSignal(db, SIG, NOW);
  assert(first.ok);
  if (!first.ok) return;
  assertEquals(first.created, true);
  assertEquals(first.level, "C1");
  assertEquals(db.tables.waouh_articles.length, 1);
  const stub = db.tables.waouh_users[0];
  assertEquals([stub.channel, stub.phone_number ?? null, stub.auth_user_id ?? null], ["external", null, null]);
  assertEquals(stub.display_name, "Boutique Cotonou Tech");
  const second = await materializeExternalSignal(db, SIG, NOW);
  assert(second.ok);
  if (second.ok) { assertEquals(second.created, false); assertEquals(second.articleId, first.articleId); }
  assertEquals(db.tables.waouh_articles.length, 1);
  assertEquals(db.counters.insertedUsers, 1, "pas de second vendeur stub");
});

Deno.test("matérialisation : signal inconnu, demande d'achat, expiré → refus sans rien créer", async () => {
  const db = fakeDb({ waouh_external_commerce_signals: [{ ...base, id: "b1", intent: "BUY" }, { ...base, id: "e1", status: "expired" }] });
  assertEquals(await materializeExternalSignal(db, "inconnu", NOW), { ok: false, code: "signal_not_found" });
  assertEquals(await materializeExternalSignal(db, "b1", NOW), { ok: false, code: "signal_not_offer" });
  assertEquals(await materializeExternalSignal(db, "e1", NOW), { ok: false, code: "signal_unavailable" });
  assertEquals(db.tables.waouh_articles.length, 0);
  assertEquals(db.tables.waouh_users.length, 0);
});

Deno.test("matérialisation : course entre deux ouvertures → un seul vendeur stub et un seul article", async () => {
  const db = fakeDb({ waouh_external_commerce_signals: [{ ...base }] });
  // Une requête concurrente a déjà créé vendeur stub + article entre notre lecture et notre insertion.
  const realFrom = db.from;
  let injected = false;
  (db as any).from = (table: string) => {
    const q = realFrom(table);
    if (table === "waouh_users" && !injected) {
      q.insert = () => {
        injected = true;
        db.tables.waouh_users.push({ id: "stub-existant", web_session_id: stubSessionKey(SIG) });
        db.tables.waouh_articles.push({ id: "ancien", seller_id: "stub-existant", origin: NEXUS_ORIGIN, created_at: "2020-01-01T00:00:00Z" });
        // violation d'unicité sur web_session_id
        const api: any = { select: () => api, single: () => Promise.resolve({ data: null, error: { code: "23505" } }) };
        return api;
      };
    }
    return q;
  };
  const r = await materializeExternalSignal(db, SIG, NOW);
  assert(r.ok);
  if (r.ok) { assertEquals(r.articleId, "ancien"); assertEquals(r.created, false); }
  assertEquals(db.tables.waouh_articles.map((a) => a.id), ["ancien"]);
  assertEquals(db.tables.waouh_users.length, 1);
});

Deno.test("le vendeur stub porte une clé de session que les clients ne peuvent pas revendiquer", () => {
  assertEquals(stubSessionKey(SIG), `nexus-ext|${SIG}`);
  assert(!/^[A-Za-z0-9_.:-]{6,200}$/.test(stubSessionKey(SIG)), "le format de session client doit rejeter la clé stub");
});

Deno.test("message d'accroche : intention + prix, sans coordonnées, borné", () => {
  const m = externalOfferMessage("Samsung *Galaxy* A54", 150000);
  assert(m.includes("« Samsung Galaxy A54 »") && /150[\s  ]000 FCFA/.test(m), m);
  assert(externalOfferMessage(null, null).includes("« votre offre »"));
  assert(externalOfferMessage("x".repeat(500), 1).length <= 1000);
});

Deno.test("transmission : classement des réponses de nexus.contact.send", () => {
  assertEquals(classifyTransmission(202, { ok: true, data: { queued: true } }), "queued");
  assertEquals(classifyTransmission(200, { ok: true }), "queued");
  assertEquals(classifyTransmission(403, { ok: false, error: { code: "contact_not_permitted" } }), "not_permitted");
  assertEquals(classifyTransmission(403, { ok: false, error: { code: "integrated_contact_path_required" } }), "not_permitted");
  assertEquals(classifyTransmission(404, { ok: false, error: { code: "contact_not_found" } }), "no_channel");
  assertEquals(classifyTransmission(404, { code: "NOT_FOUND", message: "Requested function was not found" }), "failed");
  assertEquals(classifyTransmission(422, { ok: false, error: { code: "explicit_confirmation_required" } }), "failed");
  assertEquals(classifyTransmission(500, {}), "failed");
  assertEquals(classifyTransmission(200, { ok: false }), "failed");
});

Deno.test("transmission : jeton de l'acheteur transmis, confirmation explicite, slug par défaut", async () => {
  let seen: any = null;
  const fetchImpl = ((url: string, init: any) => {
    seen = { url, headers: init.headers, body: JSON.parse(init.body) };
    return Promise.resolve(new Response(JSON.stringify({ ok: true, data: { queued: true } }), { status: 202 }));
  }) as typeof fetch;
  const r = await transmitExternalOffer({ supabaseUrl: "https://x.supabase.co", authHeader: "Bearer USER", anonKey: "anon", fabricId: `external:${SIG}`, message: "Bonjour", fetchImpl });
  assertEquals(r, { state: "queued", status: 202 });
  assertEquals(seen.url, "https://x.supabase.co/functions/v1/waouh-studio-e2e-v21465");
  assertEquals(seen.headers.Authorization, "Bearer USER");
  assertEquals(seen.body, { action: "nexus.contact.send", payload: { fabric_id: `external:${SIG}`, message: "Bonjour", confirmed: true } });
});

Deno.test("transmission : réseau coupé → failed, jamais d'exception", async () => {
  const fetchImpl = (() => Promise.reject(new Error("réseau"))) as typeof fetch;
  assertEquals((await transmitExternalOffer({ supabaseUrl: "u", authHeader: "Bearer U", fabricId: `external:${SIG}`, message: "m", fetchImpl })).state, "failed");
});

Deno.test("C0 : la transmission n'est jamais tentée ; C1 à C5 peuvent l'être (le serveur tranche)", () => {
  assertEquals(transmissionMayBePermitted("C0"), false);
  assertEquals(transmissionMayBePermitted(null), false);
  for (const level of ["C1", "C2", "C3", "C4", "C5"]) assertEquals(transmissionMayBePermitted(level), true, level);
});
