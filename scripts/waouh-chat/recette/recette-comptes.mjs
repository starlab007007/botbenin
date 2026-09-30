// Recette de bout en bout par API — comptes X (A), Y (B) et Z (administrateur, facultatif) : vendeur, acheteur, vendeur-acheteur.
// Couvre les parcours Web et Flutter (mêmes fonctions Edge : waouh-status-publish, waouh-commerce-action, waouh-match-history,
// waouh-deal-ops, waouh-channel-in-secure, waouh-avatar-briefing). Ne contacte JAMAIS de tiers externe : pas de `transmit_offer`.
// Données réelles (articles « ZZ TEST E2E … », à mettre en pause ensuite). Refuse tout projet hors liste blanche.
//
// Variables : X_EMAIL, X_PW, Y_EMAIL, Y_PW ; facultatif Z_EMAIL, Z_PW (admin : livraison, tiers, 3ᵉ acheteur) ;
//             SB_URL / SB_ANON (par défaut : lus dans src/integrations/supabase/client.ts = production) ; ONLY=S1,S3 pour limiter.
import { readFileSync } from "node:fs";
const env = process.env;
const client = readFileSync(new URL("../../../src/integrations/supabase/client.ts", import.meta.url), "utf8");
const SB_URL = env.SB_URL || client.match(/SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
const SB_ANON = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(env.SB_ANON ?? "") ? env.SB_ANON : client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/)?.[1];
const ALLOWED = ["mvynepqulhflxtyymtzs", "ljzwqyzaovnandpyfpgc"]; // production WAOUH, projet de test
if (!ALLOWED.some((ref) => SB_URL?.includes(ref))) { console.error("Refus : projet non autorisé."); process.exit(2); }
if (!env.X_EMAIL || !env.X_PW || !env.Y_EMAIL || !env.Y_PW) { console.error("Variables manquantes : X_EMAIL, X_PW, Y_EMAIL, Y_PW."); process.exit(2); }
const ONLY = env.ONLY ? new Set(env.ONLY.split(",")) : null;
const COURIER = env.COURIER_ID || "6558d4ff-1560-4177-bf2f-e5a1364e2212";
const run = Date.now().toString(36);
const rows = [];
let current = "";
const log = (status, id, detail = "", severity = "bloquant") => { rows.push({ sc: current, status, id, detail, severity }); console.log(`${status} ${id}${detail ? " — " + detail : ""}`); };
const check = (id, ok, detail = "", severity = "bloquant") => log(ok ? "PASS" : "FAIL", id, detail, severity);
const skip = (id, why) => log("SKIP", id, `NON EXÉCUTÉ — ${why}`, "info");
const scenario = (name) => { current = name; console.log(`\n## ${name}`); };

async function login(email, password) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json(); if (!j.access_token) throw new Error(`connexion refusée pour ${email} (${j.error_code ?? r.status})`);
  return { t: j.access_token, uid: j.user.id };
}
const raw = async (fn, who, body, sid = who.sid) => {
  const r = await fetch(`${SB_URL}/functions/v1/${fn}`, { method: "POST", headers: { apikey: SB_ANON, Authorization: `Bearer ${who.t}`, "Content-Type": "application/json", ...(sid ? { "x-waouh-session": sid } : {}) }, body: JSON.stringify(body) });
  let j; try { j = await r.json(); } catch { j = {}; } return { status: r.status, j };
};
let seq = 0;
const act = (who, body) => raw("waouh-commerce-action", who, { idem: `${who.tag}-${run}-${++seq}`, ...body, session_id: who.sid });
const key = (r) => r.j.reply?.key ?? r.j.code ?? "";
const ids = (r) => (r.j.actions ?? []).map((a) => String(a.id).split(":")[0]);
const digits = (s) => String(s ?? "").replace(/\D/g, "");
const created = { articles: [], deals: [], threads: [] };
const publish = async (who, title, price) => {
  const r = await raw("waouh-status-publish", who, { type: "sell", title: `ZZ TEST E2E ${title} ${run}`, caption: "Recette automatique — à ignorer", price_fcfa: price, location: "Cotonou", author_name: "TEST E2E", session_id: who.sid });
  if (r.j.article_id) created.articles.push(r.j.article_id); return r.j.article_id;
};
const hist = async (who, ctx) => {
  const r = await raw("waouh-match-history", who, { thread_id: ctx.thread, article_id: ctx.article, auth_user_id: who.uid, role: ctx.roles?.[who.tag] ?? "buyer", limit: 120, session_id: who.sid });
  const msgs = (r.j.messages || r.j.items || []).map((m) => ({ id: m.id, dir: m.direction, thread: m.thread_id ?? null, text: m.text ?? m.body ?? "", actions: (m.meta?.actions ?? m.actions ?? []).map((a) => String(a.id ?? a).split(":")[0]) }));
  return { status: r.status, ok: r.j.ok !== false && r.status === 200, msgs };
};
const has = (h, re) => h.msgs.some((m) => re.test(m.text));
const last = (h) => h.msgs.at(-1)?.text ?? "";
const dupCount = (h) => { const seen = new Map(); for (const m of h.msgs) { const k = `${m.dir}|${m.text.replace(/\s+/g, " ").trim()}`; if (m.text.length > 6) seen.set(k, (seen.get(k) ?? 0) + 1); } return [...seen.values()].filter((n) => n > 1).length; };

const X = { tag: "X", sid: `recX-${run}`, ...(await login(env.X_EMAIL, env.X_PW)) };
const Y = { tag: "Y", sid: `recY-${run}`, ...(await login(env.Y_EMAIL, env.Y_PW)) };
const Z = env.Z_EMAIL && env.Z_PW ? { tag: "Z", sid: `recZ-${run}`, ...(await login(env.Z_EMAIL, env.Z_PW)) } : null;
console.log(`Projet ${SB_URL} — comptes X, Y${Z ? ", Z (admin)" : " (sans admin : livraison et tiers NON EXÉCUTÉS)"}`);
const want = (name) => !ONLY || ONLY.has(name);

// Parcours complet vendeur S, acheteur B : intérêt → proposition → contre-proposition → accord → confirmation → paiement → (livraison) → terminé.
async function fullTrade(S, B, label, { turns = 1 } = {}) {
  const article = await publish(S, label, 100000);
  check(`${label} · le vendeur publie`, !!article, `article=${article}`);
  if (!article) return null;
  let r = await act(B, { action: "open_deal", article_id: article, source: "recette" });
  const ctx = { article, thread: r.j.thread_id, neg: r.j.negotiation_id, roles: { [S.tag]: "seller", [B.tag]: "buyer" } };
  created.threads.push(ctx.thread);
  check(`${label} · l'acheteur ouvre l'article → Intéressé (fil, négociation)`, r.status === 200 && r.j.ok && !!ctx.thread && !!ctx.neg && r.j.card?.article_id === article, `http ${r.status}, clé=${key(r)}`);
  let hs = await hist(S, ctx);
  check(`${label} · le vendeur est notifié avec Accepter / Contre-offre / Refuser`, has(hs, /Nouvel acheteur/) && ["accepter", "refuser"].every((k) => hs.msgs.at(-1)?.actions.includes(k) || hs.msgs.some((m) => m.actions.includes(k))), `boutons=${JSON.stringify(hs.msgs.at(-1)?.actions)}`);
  let price = 80000;
  for (let i = 0; i < turns; i++) {
    r = await act(B, { action: "offer", thread_id: ctx.thread, negotiation_id: ctx.neg, article_id: article, amount: price, confirmed: true });
    check(`${label} · tour ${i + 1} : l'acheteur propose ${price}`, r.status === 200 && r.j.ok && r.j.thread_id === ctx.thread, `clé=${key(r)}, thread ${r.j.thread_id === ctx.thread ? "= X" : "≠ X"}`);
    hs = await hist(S, ctx);
    check(`${label} · tour ${i + 1} : le vendeur reçoit ${price}`, digits(last(hs)).includes(String(price)), `« ${last(hs).replace(/\s+/g, " ").slice(0, 70)} »`);
    price += 10000;
    r = await act(S, { action: "offer", thread_id: ctx.thread, negotiation_id: ctx.neg, article_id: article, amount: price, confirmed: true });
    check(`${label} · tour ${i + 1} : le vendeur contre-propose ${price}`, r.status === 200 && r.j.ok && r.j.thread_id === ctx.thread, `http ${r.status}, clé=${key(r)}`);
    const hb = await hist(B, ctx);
    check(`${label} · tour ${i + 1} : l'acheteur reçoit ${price} + Accepter`, digits(last(hb)).includes(String(price)) && hb.msgs.at(-1)?.actions.includes("accepter"), `boutons=${JSON.stringify(hb.msgs.at(-1)?.actions)}`);
  }
  r = await act(B, { action: "accept", negotiation_id: ctx.neg, thread_id: ctx.thread });
  ctx.deal = r.j.deal_id; if (ctx.deal) created.deals.push(ctx.deal);
  check(`${label} · l'acheteur accepte → Accord (deal)`, r.status === 200 && r.j.ok && !!ctx.deal && r.j.thread_id === ctx.thread, `clé=${key(r)}`);
  r = await act(S, { action: "seller_confirm", deal_id: ctx.deal });
  check(`${label} · le vendeur confirme la disponibilité`, r.status === 200 && r.j.ok && r.j.thread_id === ctx.thread, `clé=${key(r)}`);
  r = await act(B, { action: "pay_mode", deal_id: ctx.deal, method: "cash" });
  check(`${label} · l'acheteur choisit le paiement à la livraison → Préparation`, r.status === 200 && r.j.ok && r.j.thread_id === ctx.thread, `étape=${r.j.stage}`);
  if (Z) {
    const a = await raw("waouh-deal-ops", Z, { action: "assign", deal_id: ctx.deal, courier_id: COURIER, eta_minutes: 30 }, Z.sid);
    check(`${label} · livreur assigné (admin ou automatique)`, (a.status === 409 && a.j.current_status === "assigned") || (a.status === 200 && (a.j.ok || a.j.success)), `http ${a.status}`);
    const p = await raw("waouh-deal-ops", Z, { action: "status", deal_id: ctx.deal, status: "picked_up" }, Z.sid);
    const d = await raw("waouh-deal-ops", Z, { action: "status", deal_id: ctx.deal, status: "delivered" }, Z.sid);
    check(`${label} · colis ramassé puis livré`, p.status === 200 && d.status === 200, `http ${p.status}/${d.status}`);
    r = await act(B, { action: "confirm_payment", deal_id: ctx.deal, method: "cash" });
    check(`${label} · paiement confirmé → Terminé`, r.status === 200 && r.j.ok && r.j.thread_id === ctx.thread, `étape=${r.j.stage}`);
  } else { skip(`${label} · livreur, livraison, paiement, clôture`, "compte administrateur Z non fourni"); }
  const ha = await hist(B, ctx), hb2 = await hist(S, ctx);
  const threads = new Set([...ha.msgs, ...hb2.msgs].map((m) => m.thread).filter(Boolean));
  check(`${label} · thread_id canonique : tous les messages sur le même fil`, threads.size <= 1 && (threads.size === 0 || threads.has(ctx.thread)), `fils vus=${threads.size}`);
  check(`${label} · aucun message en double dans les deux historiques`, dupCount(ha) === 0 && dupCount(hb2) === 0, `doublons acheteur=${dupCount(ha)}, vendeur=${dupCount(hb2)}`, "majeur");
  return ctx;
}

// ---- S1 / S2 : vendeur X → acheteur Y, puis l'inverse (vendeur-acheteur : même personne dans les deux rôles)
if (want("S1")) { scenario("S1 X vend, Y achète (1 contre-proposition)"); await fullTrade(X, Y, "S1"); }
if (want("S2")) { scenario("S2 Y vend, X achète (rôles inversés, 3 tours de négociation)"); await fullTrade(Y, X, "S2", { turns: 3 }); }

// ---- S3 : refus, nouvelle offre, bouton périmé
if (want("S3")) {
  scenario("S3 refus du vendeur, nouvelle offre, bouton périmé");
  const article = await publish(X, "Refus", 50000);
  let r = await act(Y, { action: "open_deal", article_id: article }); const ctx = { article, thread: r.j.thread_id, neg: r.j.negotiation_id, roles: { X: "seller", Y: "buyer" } };
  r = await act(Y, { action: "offer", thread_id: ctx.thread, negotiation_id: ctx.neg, article_id: article, amount: 20000, confirmed: true });
  r = await act(X, { action: "reject", thread_id: ctx.thread, negotiation_id: ctx.neg });
  check("S3a le vendeur refuse l'offre", r.status === 200 && r.j.ok, `clé=${key(r)}`);
  const hy = await hist(Y, ctx);
  check("S3b l'acheteur est informé du refus", has(hy, /refus/i), `« ${last(hy).replace(/\s+/g, " ").slice(0, 70)} »`, "majeur");
  r = await act(X, { action: "accept", thread_id: ctx.thread, negotiation_id: ctx.neg });
  check("S3c un bouton périmé (accepter après refus) est refusé, aucun deal", r.j.ok === false && !r.j.deal_id, `clé=${key(r)}`);
  r = await act(Y, { action: "offer", thread_id: ctx.thread, negotiation_id: ctx.neg, article_id: article, amount: 30000, confirmed: true });
  check("S3d nouvelle offre après refus acceptée", r.status === 200 && r.j.ok, `clé=${key(r)}`, "majeur");
}

// ---- S4 : annulation par l'acheteur avant accord ; question / réponse
if (want("S4")) {
  scenario("S4 question/réponse puis annulation");
  const article = await publish(Y, "Question", 70000);
  let r = await act(X, { action: "ask", article_id: article, text: "Est-ce garanti 1 an ?" }); const ctx = { article, thread: r.j.thread_id, roles: { X: "buyer", Y: "seller" } };
  check("S4a l'acheteur pose une question sans offre", r.status === 200 && r.j.ok && !!ctx.thread, `clé=${key(r)}`);
  let hs = await hist(Y, ctx);
  check("S4b le vendeur reçoit la question", has(hs, /garanti/i), `${hs.msgs.length} message(s)`);
  r = await act(Y, { action: "ask", thread_id: ctx.thread, article_id: article, text: "Oui, garanti 1 an." });
  const hb = await hist(X, ctx);
  check("S4c le vendeur répond, l'acheteur reçoit la réponse", r.status === 200 && r.j.ok && has(hb, /1 an/i), `clé=${key(r)}`);
  r = await act(X, { action: "cancel", thread_id: ctx.thread, article_id: article });
  check("S4d l'acheteur peut annuler / clore sans impasse (« Retirer mon offre » si une offre est en attente)", r.status === 200 || r.j.error === "no_deal" || r.j.error === "no_negotiation" || r.j.ok === true, `http=${r.status}, ok=${r.j.ok}, clé=${key(r)}`, "majeur");
}

// ---- S5 : garde-fous (soi-même, idempotence, doublons, tiers, identité)
if (want("S5")) {
  scenario("S5 garde-fous : auto-intérêt, idempotence, doublons, tiers, identité");
  const article = await publish(X, "Gardefous", 40000);
  let r = await act(X, { action: "open_deal", article_id: article });
  check("S5a le vendeur ne peut pas s'intéresser à son propre article", r.j.ok === false, `clé=${key(r)}`);
  const d1 = await act(Y, { action: "open_deal", article_id: article }); const d2 = await act(Y, { action: "open_deal", article_id: article });
  check("S5b deux « Intéressé » = même fil, même négociation", d1.j.thread_id && d1.j.thread_id === d2.j.thread_id && d1.j.negotiation_id === d2.j.negotiation_id, "");
  const ctx = { article, thread: d1.j.thread_id, neg: d1.j.negotiation_id, roles: { X: "seller", Y: "buyer" } };
  const hs = await hist(X, ctx);
  check("S5c le vendeur n'est notifié qu'une fois (pas de doublon)", hs.msgs.filter((m) => /Nouvel acheteur/.test(m.text)).length === 1, `${hs.msgs.filter((m) => /Nouvel acheteur/.test(m.text)).length} notification(s)`, "majeur");
  const body = { action: "offer", idem: `same-${run}`, thread_id: ctx.thread, negotiation_id: ctx.neg, article_id: article, amount: 25000, confirmed: true, session_id: Y.sid };
  const i1 = await raw("waouh-commerce-action", Y, body), i2 = await raw("waouh-commerce-action", Y, body);
  check("S5d même clé idem rejouée : réponse identique, marquée rejouée", i1.j.ok === true && i2.j.replayed === true, `replayed=${i2.j.replayed}`);
  const hs2 = await hist(X, ctx);
  check("S5e le rejeu n'écrit pas de 2ᵉ message d'offre", hs2.msgs.filter((m) => digits(m.text).includes("25000")).length === 1, `${hs2.msgs.filter((m) => digits(m.text).includes("25000")).length} message(s)`, "majeur");
  r = await raw("waouh-commerce-action", X, { ...body, session_id: X.sid });
  check("S5f même clé idem par un autre utilisateur = 409", r.status === 409, `http ${r.status}, ${r.j.code}`, "sécurité");
  r = await act(Y, { action: "offer", thread_id: ctx.thread, negotiation_id: ctx.neg, article_id: article, confirmed: true });
  check("S5g offre sans montant = 400", r.status === 400, `http ${r.status}, ${r.j.code}`);
  r = await act(Y, { action: "inconnue", article_id: article });
  check("S5h action inconnue = 400", r.status === 400, `http ${r.status}`);
  r = await raw("waouh-commerce-action", Y, { action: "offer", idem: "x", article_id: article, amount: 1, session_id: Y.sid });
  check("S5i clé idem trop courte = 400", r.status === 400, `http ${r.status}, ${r.j.code}`);
  if (Z) {
    r = await act(Z, { action: "offer", thread_id: ctx.thread, negotiation_id: ctx.neg, article_id: article, amount: 26000, confirmed: true });
    check("S5j un tiers (Z) ne peut pas faire d'offre dans ce fil (403)", r.status === 403, `http ${r.status}, ${r.j.code}`, "sécurité");
    const hz = await hist(Z, { ...ctx, roles: { Z: "buyer" } });
    check("S5k un tiers ne lit pas l'historique du fil", !hz.ok || hz.msgs.length === 0, `http ${hz.status}, ${hz.msgs.length} message(s)`, "sécurité");
  } else skip("S5j-k tiers (403, historique)", "compte Z non fourni");
  const anon = await raw("waouh-commerce-action", { t: SB_ANON, sid: `anon-${run}` }, { action: "open_deal", idem: `anon-${run}-1`, article_id: article, session_id: `anon-${run}` });
  check("S5l sans identité : refusé", anon.status >= 400, `http ${anon.status}`, "sécurité");
  const usurp = await raw("waouh-match-history", Y, { article_id: article, thread_id: ctx.thread, auth_user_id: X.uid, role: "seller", session_id: Y.sid });
  check("S5m jeton de Y + identifiant de X : usurpation refusée (403)", usurp.status === 403, `http ${usurp.status}, ${usurp.j.error}`, "sécurité");
}

// ---- S6 : un seul gagnant quand deux acheteurs visent le même article (Z = 2ᵉ acheteur)
if (want("S6")) {
  scenario("S6 deux acheteurs, un article : un seul deal, l'autre est prévenu");
  if (!Z) skip("S6 concurrence de deux acheteurs", "compte Z non fourni");
  else {
    const article = await publish(X, "Concurrence", 60000);
    const a = await act(Y, { action: "open_deal", article_id: article }), b = await act(Z, { action: "open_deal", article_id: article });
    check("S6a deux fils distincts pour deux acheteurs", a.j.thread_id && b.j.thread_id && a.j.thread_id !== b.j.thread_id, "");
    const oa = await act(Y, { action: "offer", thread_id: a.j.thread_id, negotiation_id: a.j.negotiation_id, article_id: article, amount: 55000, confirmed: true });
    const ob = await act(Z, { action: "offer", thread_id: b.j.thread_id, negotiation_id: b.j.negotiation_id, article_id: article, amount: 56000, confirmed: true });
    const ra = await act(X, { action: "accept", thread_id: a.j.thread_id, negotiation_id: a.j.negotiation_id });
    const rb = await act(X, { action: "accept", thread_id: b.j.thread_id, negotiation_id: b.j.negotiation_id });
    const wins = [ra, rb].filter((r) => r.j.ok && r.j.deal_id); wins.forEach((w) => created.deals.push(w.j.deal_id));
    check("S6b un seul deal est créé", wins.length === 1, `ok=${[ra, rb].map((r) => r.j.ok).join("/")}, clés=${[ra, rb].map(key).join("/")}`);
    const loser = wins.length && wins[0] === ra ? { who: Z, ctx: { article, thread: b.j.thread_id, roles: { Z: "buyer" } } } : { who: Y, ctx: { article, thread: a.j.thread_id, roles: { Y: "buyer" } } };
    const hl = await hist(loser.who, loser.ctx);
    check("S6c l'acheteur évincé est prévenu (réservé / indisponible)", has(hl, /r[ée]serv|plus disponible|vendu|indisponible|un autre achete/i), `« ${last(hl).replace(/\s+/g, " ").slice(0, 80)} »`, "majeur");
    const again = await act(loser.who, { action: "open_deal", article_id: article });
    check("S6d ouvrir l'article réservé est refusé clairement", again.j.ok === false && /article_(reserved|sold)/.test(key(again)), `clé=${key(again)}`);
  }
}

// ---- S7 : chat libre (Web et Flutter) : « Je vends », « Je cherche », demande, via waouh-channel-in-secure
if (want("S7")) {
  scenario("S7 chat libre : je vends / je cherche / demande (moteur Muse, NEXUS, Signal Fabric)");
  const chat = async (who, text) => raw("waouh-channel-in-secure", who, { channel: "web", sessionId: who.sid, text, attachments: [], lat: 6.3703, lng: 2.3912, city: "Cotonou", authUserId: who.uid }, who.sid);
  let r = await chat(Y, `Je cherche ZZ TEST E2E introuvable ${run}`);
  check("S7a « Je cherche … » : réponse du moteur, intention reconnue", r.status === 200 && (r.j.ok !== false) && !!(r.j.intent || r.j.reply || r.j.text), `http ${r.status}, intent=${r.j.intent}, réponse=« ${String(r.j.reply_text ?? r.j.reply ?? r.j.text ?? "").replace(/\s+/g, " ").slice(0, 80)} »`);
  const cards = r.j.results ?? r.j.products ?? r.j.meta?.results ?? [];
  console.log(`   (résultats/cartes renvoyés : ${Array.isArray(cards) ? cards.length : "?"}, sources : ${JSON.stringify(r.j.source_mix ?? r.j.meta?.source_mix ?? null)})`);
  r = await chat(X, `Je vends ZZ TEST E2E chat ${run} à 15000 FCFA à Cotonou`);
  check("S7b « Je vends … » : réponse du moteur", r.status === 200 && r.j.ok !== false, `http ${r.status}, intent=${r.j.intent}, article=${r.j.article_id ?? "—"}`);
  if (r.j.article_id) created.articles.push(r.j.article_id);
  r = await chat(Y, `Demande : je voudrais une ZZ TEST E2E demande ${run}`);
  check("S7c demande libre : réponse du moteur", r.status === 200 && r.j.ok !== false, `http ${r.status}, intent=${r.j.intent}`, "majeur");
}

// ---- S8 : avatar guide (points, tableau de mission, réglages, anti-spam)
if (want("S8")) {
  scenario("S8 avatar : accueil, point, tableau de mission, réglages, anti-doublon");
  const av = (who, body) => raw("waouh-avatar-briefing", who, { ...body, session_id: who.sid });
  let r = await av(Y, { action: "status" });
  check("S8a tableau de mission renvoyé", r.status === 200 && r.j.ok && r.j.board && typeof r.j.board.searches === "number", `http ${r.status}, board=${JSON.stringify(r.j.board)}`, "majeur");
  r = await av(Y, { action: "set_prefs", prefs: { welcome: true, cadence: "daily", notify_events: true, notify_digest: false } });
  check("S8b réglages enregistrés (bilans WhatsApp coupés par défaut)", r.status === 200 && r.j.ok && r.j.prefs?.notify_digest === false, `http ${r.status}, prefs=${JSON.stringify(r.j.prefs)}`);
  r = await av(Y, { action: "now" });
  const msgs = r.j.messages ?? (r.j.message ? [r.j.message] : []);
  check("S8c « Faire le point » : 1 à 3 bulles courtes, boutons sur la dernière", r.status === 200 && r.j.sent === true && msgs.length >= 1 && msgs.length <= 3 && msgs.every((m) => m.text.length < 200), `http ${r.status}, ${msgs.length} bulle(s), raison=${r.j.reason}`, "majeur");
  r = await av(Y, { action: "open" });
  check("S8d ouverture répétée : pas de second accueil (30 min)", r.j.sent === false && r.j.reason === "too_soon", `sent=${r.j.sent}, raison=${r.j.reason}`);
  r = await raw("waouh-avatar-briefing", { t: SB_ANON, sid: "anon" }, { action: "tick" });
  check("S8e le tick planifié refuse un appel non service", r.status === 401, `http ${r.status}`, "sécurité");
}

// ---- Bilan
const tally = (s) => rows.filter((r) => r.status === s).length;
console.log(`\n==== BILAN : ${tally("PASS")} réussis, ${tally("FAIL")} échecs, ${tally("SKIP")} non exécutés ====`);
for (const f of rows.filter((r) => r.status === "FAIL")) console.log(` - [${f.severity}] ${f.sc} · ${f.id} : ${f.detail}`);
console.log(JSON.stringify({ run, created }));
process.exit(tally("FAIL") ? 1 : 0);
