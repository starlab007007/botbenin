// Parcours acheteur (A) / vendeur (B) avec contre-proposition, jusqu'à « Terminé » — VRAIES edge functions du projet de test.
// A = compte acheteur, B = compte vendeur. Livreur : compte admin de test (has_role simulé) + livreur au registre (simulé).
// Variables : SB_URL, SB_ANON, PW_BUYER, PW_SELLER, PW_ADMIN. Refuse tout projet autre que le projet de test.
const { SB_URL, SB_ANON, PW_BUYER, PW_SELLER, PW_ADMIN } = process.env;
if (!SB_URL?.includes("ljzwqyzaovnandpyfpgc")) { console.error("Refus : ce script ne cible que botbj-test-e2e."); process.exit(2); }
const errors = [], results = [];
const step = (id, ok, detail, severity = "bloquant") => { results.push({ id, ok }); if (!ok) errors.push({ id, severity, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${id} — ${detail}`); };
async function login(email, password) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json(); if (!j.access_token) throw new Error("login " + email + " : " + JSON.stringify(j).slice(0, 100)); return j.access_token;
}
const call = async (name, who, body) => {
  const r = await fetch(`${SB_URL}/functions/v1/${name}`, { method: "POST", headers: { apikey: SB_ANON, Authorization: `Bearer ${who.t}`, "Content-Type": "application/json", "x-waouh-session": who.sid }, body: JSON.stringify({ ...body, session_id: who.sid }) });
  let j; try { j = await r.json(); } catch { j = {}; } return { status: r.status, j };
};
const run = Date.now().toString(36);
const A = { name: "A (acheteur)", uid: "22222222-2222-4222-8222-222222222222", role: "buyer", sid: `sessA-${run}` };
const B = { name: "B (vendeur)", uid: "11111111-1111-4111-8111-111111111111", role: "seller", sid: `sessB-${run}` };
const ADM = { name: "admin", sid: `sessAdm-${run}` };
A.t = await login("acheteur.b.test@botbj-test.invalid", PW_BUYER); B.t = await login("vendeur.a.test@botbj-test.invalid", PW_SELLER); ADM.t = await login("admin.test@botbj-test.invalid", PW_ADMIN);
const digits = (s) => String(s ?? "").replace(/\D/g, "");
let article, thread, neg, deal;
const hist = async (who) => {
  const r = await call("waouh-match-history", who, { thread_id: thread, article_id: article, auth_user_id: who.uid, role: who.role, limit: 100 });
  return (r.j.messages || r.j.items || []).map((m) => ({ id: m.id, dir: m.direction, text: m.text ?? m.body ?? "", actions: m.meta?.actions ?? m.actions ?? [], at: m.created_at ?? m.at }));
};
const lastText = (h) => h.length ? h[h.length - 1].text : "";
const actionIds = (h) => (h.length ? h[h.length - 1].actions : []).map((a) => String(a.id ?? a.payload ?? a).split(":")[0]);

// Publication par B (vendeur) — réelle.
let r = await call("waouh-status-publish", B, { type: "sell", title: `TEST Console PS5 ${run}`, caption: "Avec 2 manettes", price_fcfa: 300000, location: "Cotonou", author_name: "TEST Vendeur" });
article = r.j.article_id; step("P0 B a publié l'article (réel)", r.status === 200 && !!article, `http ${r.status}, article=${article}`);

// J1 : A ouvre l'article (lecture de la fiche par le moteur : open_deal renvoie la carte).
// J2 : A → Intéressé
r = await call("waouh-commerce-action", A, { action: "open_deal", idem: `open-${run}`, article_id: article, source: "test_e2e" });
thread = r.j.thread_id; neg = r.j.negotiation_id;
step("J1 A ouvre l'article : fiche renvoyée", r.status === 200 && r.j.card?.article_id === article && r.j.card?.price === 300000, `carte=${JSON.stringify(r.j.card ?? null).slice(0, 110)}`);
step("J2 A → Intéressé : fil et négociation créés", r.status === 200 && r.j.ok === true && !!thread && !!neg && r.j.role === "buyer", `http ${r.status}, ok=${r.j.ok}, étape=${r.j.stage}, tour=${r.j.turn}, clé=${r.j.reply?.key ?? ""}`);
// J3 : B reçoit la notification
let hB = await hist(B), hA = await hist(A);
step("J3 B reçoit la notification d'intérêt (historique côté vendeur)", hB.length > 0 && /int[ée]ress|offre|300/i.test(hB.map((m) => m.text).join(" ")), `${hB.length} msg côté vendeur ; dernier : « ${lastText(hB).replace(/\s+/g, " ").slice(0, 100)} »`);
step("J3b B voit des boutons d'action (Accepter / Contre-offre / Refuser)", ["accepter", "refuser"].every((k) => actionIds(hB).some((a) => a.startsWith(k))), `boutons=${JSON.stringify(actionIds(hB))}`, "majeur");
// J4 : A → proposition de prix
const nBbefore = hB.length;
r = await call("waouh-commerce-action", A, { action: "offer", idem: `offerA-${run}`, thread_id: thread, negotiation_id: neg, article_id: article, amount: 250000, confirmed: true });
step("J4 A propose 250 000", r.status === 200 && r.j.ok === true && r.j.reply?.key === "offer_sent", `http ${r.status}, ok=${r.j.ok}, clé=${r.j.reply?.key}`);
hB = await hist(B);
step("J5 B reçoit la proposition (nouveau message contenant 250 000)", hB.length > nBbefore && digits(lastText(hB)).includes("250000"), `msgs ${nBbefore}→${hB.length} ; dernier : « ${lastText(hB).replace(/\s+/g, " ").slice(0, 110)} »`);
step("J5b B a les boutons Accepter / Contre-offre / Refuser sur la proposition", ["accepter", "refuser"].every((k) => actionIds(hB).some((a) => a.startsWith(k))) && actionIds(hB).some((a) => /contre|counter/.test(a)), `boutons=${JSON.stringify(actionIds(hB))}`, "majeur");
// J6 : B → contre-proposition
const nAbefore = (await hist(A)).length;
r = await call("waouh-commerce-action", B, { action: "offer", idem: `counterB-${run}`, thread_id: thread, negotiation_id: neg, article_id: article, amount: 280000, confirmed: true });
step("J6 B fait une contre-proposition 280 000", r.status === 200 && r.j.ok === true, `http ${r.status}, ok=${r.j.ok}, rôle=${r.j.role}, clé=${r.j.reply?.key}, tour=${r.j.turn}`);
hA = await hist(A);
step("J7 A reçoit la contre-proposition (message contenant 280 000)", hA.length > nAbefore && digits(lastText(hA)).includes("280000"), `msgs ${nAbefore}→${hA.length} ; dernier : « ${lastText(hA).replace(/\s+/g, " ").slice(0, 110)} »`);
step("J7b A a le bouton Accepter sur la contre-proposition", actionIds(hA).some((a) => a.startsWith("accepter")), `boutons=${JSON.stringify(actionIds(hA))}`, "majeur");
// J8 : A → Accepter
r = await call("waouh-commerce-action", A, { action: "accept", idem: `acceptA-${run}`, negotiation_id: neg, thread_id: thread });
deal = r.j.deal_id;
step("J8 A accepte → Accord (deal créé)", r.status === 200 && r.j.ok === true && !!deal, `http ${r.status}, ok=${r.j.ok}, deal=${deal}, étape=${r.j.stage}, clé=${r.j.reply?.key}`);
hB = await hist(B);
step("J8b B est informé de l'accord (message d'accord côté vendeur)", /accord|accept/i.test(lastText(hB)) || /accord|accept/i.test(hB.slice(-3).map((m) => m.text).join(" ")), `dernier côté vendeur : « ${lastText(hB).replace(/\s+/g, " ").slice(0, 110)} »`, "majeur");
// J9 : Préparation
r = await call("waouh-commerce-action", B, { action: "seller_confirm", idem: `scB-${run}`, deal_id: deal });
step("J9a B confirme la disponibilité", r.status === 200 && r.j.ok === true, `http ${r.status}, étape=${r.j.stage}, clé=${r.j.reply?.key}`);
r = await call("waouh-commerce-action", A, { action: "pay_mode", idem: `pmA-${run}`, deal_id: deal, method: "cash" });
step("J9b A choisit le paiement à la livraison → Préparation", r.status === 200 && r.j.ok === true && ["preparation", "courier"].includes(r.j.stage), `http ${r.status}, étape=${r.j.stage}, tour=${r.j.turn}`);
// J10 : Livreur (assign / ramassage / livraison via waouh-deal-ops avec compte admin de test)
r = await call("waouh-deal-ops", ADM, { action: "assign", deal_id: deal, courier_id: "44444444-4444-4444-8444-444444444444", eta_minutes: 30 });
const autoAssigned = r.status === 409 && r.j.current_status === "assigned";
step("J10a livreur assigné (automatiquement si un livreur est au registre, sinon par l'admin)", autoAssigned || (r.status === 200 && (r.j.ok || r.j.success)), autoAssigned ? "déjà assigné automatiquement après le choix du paiement" : `http ${r.status}, ${JSON.stringify(r.j).slice(0, 140)}`);
r = await call("waouh-deal-ops", ADM, { action: "status", deal_id: deal, status: "picked_up" });
step("J10b livreur : colis ramassé", r.status === 200, `http ${r.status}, ${JSON.stringify(r.j).slice(0, 120)}`);
r = await call("waouh-deal-ops", ADM, { action: "status", deal_id: deal, status: "delivered" });
step("J11 Livraison : livré", r.status === 200, `http ${r.status}, ${JSON.stringify(r.j).slice(0, 120)}`);
// J12 : Paiement
r = await call("waouh-commerce-action", A, { action: "confirm_payment", idem: `cpA-${run}`, deal_id: deal, method: "cash" });
step("J12 A confirme le paiement → Terminé", r.status === 200 && r.j.ok === true, `http ${r.status}, étape=${r.j.stage}, ${JSON.stringify(r.j.reply?.title)}`);
hA = await hist(A); hB = await hist(B);
step("J13 historique final cohérent des deux côtés", hA.length > 0 && hB.length > 0, `A=${hA.length} msgs, B=${hB.length} msgs`);
// Ordre de la chronologie : l'écho de l'action de l'utilisateur doit précéder la réponse du système qu'il a déclenchée.
const ord = (h, echo, reply) => { const e = h.findIndex((m) => echo.test(m.text)), p = h.findIndex((m) => reply.test(m.text)); return { e, p, ok: e >= 0 && p >= 0 && e < p }; };
for (const [label, h, echo, reply] of [
  ["A · choix du paiement", hA, /Paiement cash à la livraison/, /Paiement choisi/],
  ["A · confirmation du paiement", hA, /Je confirme le paiement/, /Vente terminée/],
  ["B · disponibilité confirmée", hB, /Article disponible/, /Article confirmé/],
]) { const o = ord(h, echo, reply); step(`J14 ordre de la chronologie — ${label}`, o.ok, `écho #${o.e}, réponse #${o.p}${o.ok ? "" : " (la réponse s'affiche avant l'action qui l'a déclenchée)"}`, "moyen"); }
console.log(JSON.stringify({ article, thread, neg, deal }));
console.log(`\n${results.filter((x) => x.ok).length}/${results.length} étapes passées`);
if (errors.length) { console.log("ERREURS :"); for (const e of errors) console.log(` - [${e.severity}] ${e.id} : ${e.detail}`); }
process.exit(errors.length ? 1 : 0);
