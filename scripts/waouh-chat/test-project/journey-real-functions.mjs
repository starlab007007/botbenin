// Parcours vendeur A / acheteur B via les VRAIES edge functions du projet de test (botbj-test-e2e).
// Phase 1 (défaut) : B contacte, propose, A accepte, rejeu idem, A confirme, B choisit le paiement, garde-fous, historiques.
// [SIMULÉ] La livraison est l'étape livreur/admin : à simuler en SQL entre les deux phases (voir docs).
// Phase 2 (PHASE=finish, THREAD_ID, DEAL_ID) : B confirme le paiement après livraison → deal terminé.
// Variables : SB_URL, SB_ANON, ARTICLE_ID, PW_A, PW_B. Refuse tout projet autre que le projet de test.
import { isDeepStrictEqual } from "node:util";
const { SB_URL, SB_ANON, ARTICLE_ID, PW_A, PW_B, PHASE, THREAD_ID, DEAL_ID } = process.env;
if (!SB_URL?.includes("ljzwqyzaovnandpyfpgc")) { console.error("Refus : ce script ne cible que botbj-test-e2e."); process.exit(2); }
const results = [];
const step = (id, ok, detail) => { results.push({ id, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} — ${detail}`); };
async function login(email, password) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json(); if (!j.access_token) throw new Error("login " + email + " : " + JSON.stringify(j).slice(0, 120));
  return j.access_token;
}
const fn = async (name, token, body, sid) => {
  const r = await fetch(`${SB_URL}/functions/v1/${name}`, { method: "POST", headers: { apikey: SB_ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-waouh-session": sid }, body: JSON.stringify({ ...body, session_id: sid }) });
  let j; try { j = await r.json(); } catch { j = {}; } return { status: r.status, j };
};
const strip = (o) => { const c = { ...o }; delete c.replayed; return c; };
const run = Date.now().toString(36);
const A = { uid: "11111111-1111-4111-8111-111111111111", sid: `sessA-${run}` }, B = { uid: "22222222-2222-4222-8222-222222222222", sid: `sessB-${run}` };
A.t = await login("vendeur.a.test@botbj-test.invalid", PW_A); B.t = await login("acheteur.b.test@botbj-test.invalid", PW_B);
step("S0 connexions Auth A et B", true, "jetons obtenus");
const ca = (who, body) => fn("waouh-commerce-action", who.t, body, who.sid);
let threadId = THREAD_ID, dealId = DEAL_ID, negId, r;

if (PHASE !== "finish") {
  r = await ca(B, { action: "open_deal", idem: `open-${run}`, article_id: ARTICLE_ID, source: "test_e2e" });
  threadId = r.j.thread_id; negId = r.j.negotiation_id;
  step("S1 B contacte le vendeur (open_deal)", r.status === 200 && r.j.ok === true && !!threadId && !!negId, `http ${r.status}, thread=${threadId}`);
  r = await ca(B, { action: "offer", idem: `offer-${run}`, thread_id: threadId, negotiation_id: negId, article_id: ARTICLE_ID, amount: 130000, confirmed: true });
  step("S2 B propose 130000 (offer)", r.status === 200 && r.j.ok === true, `http ${r.status}, ok=${r.j.ok}, clé=${r.j.reply?.key ?? ""}`);
  r = await ca(A, { action: "accept", idem: `accept-${run}`, negotiation_id: negId, thread_id: threadId });
  dealId = r.j.deal_id;
  step("S3 A accepte l'offre", r.status === 200 && r.j.ok === true && !!dealId, `http ${r.status}, deal=${dealId}`);
  const again = await ca(A, { action: "accept", idem: `accept-${run}`, negotiation_id: negId, thread_id: threadId });
  step("S4 rejeu de la même clé idem", again.j.replayed === true && isDeepStrictEqual(strip(again.j), strip(r.j)), "même réponse, marquée replayed");
  r = await ca(A, { action: "seller_confirm", idem: `sc-${run}`, deal_id: dealId });
  step("S5 A confirme la disponibilité", r.status === 200 && r.j.ok === true, `http ${r.status}, étape=${r.j.stage}`);
  r = await ca(B, { action: "pay_mode", idem: `pm-${run}`, deal_id: dealId, method: "cash" });
  step("S6 B choisit le paiement à la livraison", r.status === 200 && r.j.ok === true, `http ${r.status}, étape=${r.j.stage}, tour=${r.j.turn}`);
  r = await ca(A, { action: "confirm_payment", idem: `cpA-${run}`, deal_id: dealId, method: "cash" });
  step("S7 garde-fou : le vendeur ne peut pas confirmer le paiement", r.j.ok === false, `refus attendu, clé=${r.j.reply?.key}`);
  r = await ca(B, { action: "confirm_payment", idem: `cpB0-${run}`, deal_id: dealId, method: "cash" });
  step("S8 garde-fou : paiement refusé avant livraison", r.j.ok === false, `refus attendu, clé=${r.j.reply?.key}`);
} else {
  r = await ca(B, { action: "confirm_payment", idem: `cpB-${run}`, deal_id: dealId, method: "cash" });
  step("S9 B confirme le paiement après livraison", r.status === 200 && r.j.ok === true, `http ${r.status}, étape=${r.j.stage}, ${JSON.stringify(r.j.reply?.title)}`);
}
for (const [who, role] of [[A, "seller"], [B, "buyer"]]) {
  r = await fn("waouh-match-history", who.t, { thread_id: threadId, article_id: ARTICLE_ID, auth_user_id: who.uid, role }, who.sid);
  const n = (r.j.messages || r.j.items || []).length;
  step(`S10 historique du fil côté ${role}`, r.status === 200 && n > 0, `http ${r.status}, ${n} messages`);
}
console.log(JSON.stringify({ threadId, negId, dealId }));
const failed = results.filter((x) => !x.ok).length; console.log(`\n${results.length - failed}/${results.length} étapes passées`); process.exit(failed ? 1 : 0);
