// Parcours acheteur (A) / vendeur (B) jusqu'à « Terminé » en PRODUCTION, avec le thread_id canonique vérifié à chaque étape.
// Données RÉELLES (autorisées par le propriétaire) : article au titre « ZZ TEST E2E » (aucune correspondance attendue avec un catalogue réel),
// comptes dédiés A / B / admin fournis par le propriétaire. Livreur : livreur de test « E2E FULL Courier ».
// Variables : SB_URL, SB_ANON, A_EMAIL, B_EMAIL, ADM_EMAIL, PW_A, PW_B, PW_ADM. Refuse tout projet autre que la production WAOUH.
const { SB_URL, SB_ANON, A_EMAIL, B_EMAIL, ADM_EMAIL, PW_A, PW_B, PW_ADM } = process.env;
if (!SB_URL?.includes("mvynepqulhflxtyymtzs")) { console.error("Refus : ce script ne cible que la production WAOUH."); process.exit(2); }
const COURIER = "6558d4ff-1560-4177-bf2f-e5a1364e2212";
const errors = [], results = [];
const step = (id, ok, detail, severity = "bloquant") => { results.push({ id, ok }); if (!ok) errors.push({ id, severity, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${id} — ${detail}`); };
async function login(email, password) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json(); if (!j.access_token) throw new Error(`connexion refusée pour ${email} (${j.error_code ?? r.status})`); return { t: j.access_token, uid: j.user.id };
}
const call = async (name, who, body) => {
  const r = await fetch(`${SB_URL}/functions/v1/${name}`, { method: "POST", headers: { apikey: SB_ANON, Authorization: `Bearer ${who.t}`, "Content-Type": "application/json", "x-waouh-session": who.sid }, body: JSON.stringify({ ...body, session_id: who.sid }) });
  let j; try { j = await r.json(); } catch { j = {}; } return { status: r.status, j };
};
const run = Date.now().toString(36);
const A = { role: "buyer", sid: `e2eA-${run}`, ...(await login(A_EMAIL, PW_A)) };
const B = { role: "seller", sid: `e2eB-${run}`, ...(await login(B_EMAIL, PW_B)) };
const ADM = { sid: `e2eAdm-${run}`, ...(await login(ADM_EMAIL, PW_ADM)) };
step("S0 connexions A, B et admin", true, "jetons obtenus");
const digits = (s) => String(s ?? "").replace(/\D/g, "");
let article, thread, neg, deal;
const X = {};
const hist = async (who) => {
  const r = await call("waouh-match-history", who, { thread_id: thread, article_id: article, auth_user_id: who.uid, role: who.role, limit: 100 });
  return (r.j.messages || r.j.items || []).map((m) => ({ id: m.id, thread: m.thread_id ?? null, text: m.text ?? m.body ?? "", actions: m.meta?.actions ?? m.actions ?? [] }));
};
const lastText = (h) => h.length ? h[h.length - 1].text : "";
const actionIds = (h) => (h.length ? h[h.length - 1].actions : []).map((a) => String(a.id ?? a.payload ?? a).split(":")[0]);
const onX = (stage, r) => { X[stage] = r.j.thread_id ?? null; return X[stage] === thread; };

let r = await call("waouh-status-publish", B, { type: "sell", title: `ZZ TEST E2E ${run}`, caption: "Test automatique — à ignorer", price_fcfa: 100000, location: "Cotonou", author_name: "TEST E2E" });
article = r.j.article_id; step("P0 B publie l'article de test", r.status === 200 && !!article, `http ${r.status}, article=${article}`);
r = await call("waouh-commerce-action", A, { action: "open_deal", idem: `open-${run}`, article_id: article, source: "test_e2e_prod" });
thread = r.j.thread_id; neg = r.j.negotiation_id; X.interet = thread;
step("J1 A ouvre l'article : fiche renvoyée", r.status === 200 && r.j.card?.article_id === article, `carte=${JSON.stringify(r.j.card ?? null).slice(0, 100)}`);
step("J2 A → Intéressé : fil canonique X et négociation créés", r.status === 200 && r.j.ok === true && !!thread && !!neg && r.j.role === "buyer", `http ${r.status}, thread=${thread}, clé=${r.j.reply?.key}`);
let hB = await hist(B);
step("J3 B reçoit la notification d'intérêt", hB.length > 0 && /int[ée]ress|offre|100/i.test(hB.map((m) => m.text).join(" ")), `${hB.length} msg ; « ${lastText(hB).replace(/\s+/g, " ").slice(0, 90)} »`);
step("J3b B voit Accepter / Contre-offre / Refuser", ["accepter", "refuser"].every((k) => actionIds(hB).some((a) => a.startsWith(k))), `boutons=${JSON.stringify(actionIds(hB))}`, "majeur");
r = await call("waouh-commerce-action", A, { action: "open_deal", idem: `open2-${run}`, article_id: article });
step("J2b rouvrir l'article : même fil X, aucun doublon", r.j.thread_id === thread && r.j.negotiation_id === neg, `thread ${r.j.thread_id === thread ? "= X" : "≠ X"}`);
let n0 = hB.length;
r = await call("waouh-commerce-action", A, { action: "offer", idem: `o1-${run}`, thread_id: thread, negotiation_id: neg, article_id: article, amount: 80000, confirmed: true });
step("J4 A propose 80 000 (thread = X)", r.status === 200 && r.j.ok === true && onX("proposition", r), `http ${r.status}, thread ${r.j.thread_id === thread ? "= X" : "≠ X"}`);
hB = await hist(B);
step("J5 B reçoit la proposition + boutons", hB.length > n0 && digits(lastText(hB)).includes("80000") && ["accepter", "refuser"].every((k) => actionIds(hB).some((a) => a.startsWith(k))), `« ${lastText(hB).replace(/\s+/g, " ").slice(0, 90)} » ${JSON.stringify(actionIds(hB))}`);
n0 = (await hist(A)).length;
r = await call("waouh-commerce-action", B, { action: "offer", idem: `o2-${run}`, thread_id: thread, negotiation_id: neg, article_id: article, amount: 90000, confirmed: true });
step("J6 B contre-propose 90 000 (thread = X)", r.status === 200 && r.j.ok === true && onX("contre_proposition", r), `http ${r.status}, thread ${r.j.thread_id === thread ? "= X" : "≠ X"}`);
let hA = await hist(A);
step("J7 A reçoit la contre-proposition + Accepter", hA.length > n0 && digits(lastText(hA)).includes("90000") && actionIds(hA).some((a) => a.startsWith("accepter")), `« ${lastText(hA).replace(/\s+/g, " ").slice(0, 90)} » ${JSON.stringify(actionIds(hA))}`);
r = await call("waouh-commerce-action", A, { action: "accept", idem: `ac-${run}`, negotiation_id: neg, thread_id: thread });
deal = r.j.deal_id;
step("J8 A accepte → Accord (deal, thread = X)", r.status === 200 && r.j.ok === true && !!deal && onX("accord", r), `http ${r.status}, deal=${deal}, thread ${r.j.thread_id === thread ? "= X" : "≠ X"}`);
hB = await hist(B);
step("J8b B est informé de l'accord", /accord|accept/i.test(hB.slice(-3).map((m) => m.text).join(" ")), `« ${lastText(hB).replace(/\s+/g, " ").slice(0, 90)} »`, "majeur");
r = await call("waouh-commerce-action", B, { action: "seller_confirm", idem: `sc-${run}`, deal_id: deal });
step("J9a B confirme la disponibilité (thread = X)", r.status === 200 && r.j.ok === true && onX("confirmation_vendeur", r), `http ${r.status}, thread ${r.j.thread_id === thread ? "= X" : "≠ X"}`);
r = await call("waouh-commerce-action", A, { action: "pay_mode", idem: `pm-${run}`, deal_id: deal, method: "cash" });
step("J9b A choisit le paiement à la livraison → Préparation (thread = X)", r.status === 200 && r.j.ok === true && onX("preparation", r), `http ${r.status}, étape=${r.j.stage}, thread ${r.j.thread_id === thread ? "= X" : "≠ X"}`);
r = await call("waouh-deal-ops", ADM, { action: "assign", deal_id: deal, courier_id: COURIER, eta_minutes: 30 });
const auto = r.status === 409 && r.j.current_status === "assigned";
step("J10a livreur assigné (admin ou automatique)", auto || (r.status === 200 && (r.j.ok || r.j.success)), auto ? "déjà assigné automatiquement" : `http ${r.status}, ${JSON.stringify(r.j).slice(0, 120)}`);
r = await call("waouh-deal-ops", ADM, { action: "status", deal_id: deal, status: "picked_up" });
step("J10b livreur : colis ramassé", r.status === 200, `http ${r.status}, ${JSON.stringify(r.j).slice(0, 110)}`);
r = await call("waouh-deal-ops", ADM, { action: "status", deal_id: deal, status: "delivered" });
step("J11 Livraison : livré", r.status === 200, `http ${r.status}, ${JSON.stringify(r.j).slice(0, 110)}`);
r = await call("waouh-commerce-action", A, { action: "confirm_payment", idem: `cp-${run}`, deal_id: deal, method: "cash" }); X.paiement = r.j.thread_id ?? null;
step("J12 A confirme le paiement → Terminé (thread = X)", r.status === 200 && r.j.ok === true && X.paiement === thread, `http ${r.status}, étape=${r.j.stage}, thread ${X.paiement === thread ? "= X" : "≠ X (" + X.paiement + ")"}`);
hA = await hist(A); hB = await hist(B);
step("J13 historiques finaux : tous les messages sur X", hA.length > 0 && hB.length > 0 && [...hA, ...hB].every((m) => !m.thread || m.thread === thread), `A=${hA.length}, B=${hB.length}, threads=${[...new Set([...hA, ...hB].map((m) => m.thread).filter(Boolean))].join(",")}`);
console.log(JSON.stringify({ article, thread, neg, deal, X }));
console.log(`\n${results.filter((x) => x.ok).length}/${results.length} étapes passées`);
if (errors.length) { console.log("ERREURS :"); for (const e of errors) console.log(` - [${e.severity}] ${e.id} : ${e.detail}`); }
process.exit(errors.length ? 1 : 0);
