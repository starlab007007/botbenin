// Parcours « Chat Center → carte produit → Deal Room » avec vérification du thread_id canonique à CHAQUE étape.
// VRAIES edge functions du projet de test. A = acheteur, B = vendeur. S'arrête à « Préparation » (livreur : compte admin requis).
// Variables : SB_URL, SB_ANON, PW_BUYER, PW_SELLER. Refuse tout projet autre que le projet de test.
const { SB_URL, SB_ANON, PW_BUYER, PW_SELLER } = process.env;
if (!SB_URL?.includes("ljzwqyzaovnandpyfpgc")) { console.error("Refus : ce script ne cible que botbj-test-e2e."); process.exit(2); }
const errors = [], results = [];
const step = (id, ok, detail, severity = "bloquant") => { results.push({ id, ok }); if (!ok) errors.push({ id, severity, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${id} — ${detail}`); };
async function login(email, password) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json(); if (!j.access_token) throw new Error("login " + email); return j.access_token;
}
const call = async (name, who, body) => {
  const r = await fetch(`${SB_URL}/functions/v1/${name}`, { method: "POST", headers: { apikey: SB_ANON, Authorization: `Bearer ${who.t}`, "Content-Type": "application/json", "x-waouh-session": who.sid }, body: JSON.stringify({ ...body, session_id: who.sid }) });
  let j; try { j = await r.json(); } catch { j = {}; } return { status: r.status, j };
};
const run = Date.now().toString(36);
const A = { uid: "22222222-2222-4222-8222-222222222222", role: "buyer", sid: `sessA-${run}` };
const B = { uid: "11111111-1111-4111-8111-111111111111", role: "seller", sid: `sessB-${run}` };
A.t = await login("acheteur.b.test@botbj-test.invalid", PW_BUYER); B.t = await login("vendeur.a.test@botbj-test.invalid", PW_SELLER);
const X = {}; // thread_id canonique vu à chaque étape
const seen = (stage, r) => { X[stage] = r.j.thread_id ?? r.j.card?.thread_id ?? null; return X[stage]; };

// Entrée : B publie (l'article entre au catalogue) ; A le trouve comme CARTE PRODUIT (fabric_id article:…).
let r = await call("waouh-status-publish", B, { type: "sell", title: `TEST Enceinte JBL ${run}`, caption: "Neuve", price_fcfa: 90000, location: "Cotonou", author_name: "TEST Vendeur" });
const article = r.j.article_id; step("C0 carte produit : l'article est publié (catalogue → article_id)", r.status === 200 && !!article, `http ${r.status}, article_id=${article}`);
r = await call("waouh-commerce-action", A, { action: "open_deal", idem: `card-${run}`, fabric_id: `article:${article}`, source: "chat_center_card" });
const thread = seen("interet", r); const neg = r.j.negotiation_id;
step("C1 carte produit → Intéressé : thread_id canonique créé", r.status === 200 && r.j.ok === true && !!thread && !!neg && r.j.article_id === article, `http ${r.status}, thread=${thread}, article=${r.j.article_id}`);
// Deal Room : rouvrir la même carte / cliquer une seconde fois → MÊME fil (pas de doublon).
r = await call("waouh-commerce-action", A, { action: "open_deal", idem: `card2-${run}`, fabric_id: `article:${article}`, source: "chat_center_card" });
step("C2 rouvrir la carte : même thread_id, même négociation (aucun doublon)", r.j.thread_id === thread && r.j.negotiation_id === neg, `thread ${r.j.thread_id === thread ? "=" : "≠"} X, négo ${r.j.negotiation_id === neg ? "=" : "≠"}`);
r = await call("waouh-commerce-action", A, { action: "open_deal", idem: `art-${run}`, article_id: article, source: "deal_rooms_list" });
step("C3 ouverture par article_id (liste des Deal Rooms / historique) : même thread_id", r.j.thread_id === thread, `thread=${r.j.thread_id}`);
// Historique : la Deal Room X apparaît pour les deux parties, avec des messages rattachés à X.
const hist = async (who) => (await call("waouh-match-history", who, { thread_id: thread, article_id: article, auth_user_id: who.uid, role: who.role, limit: 100 })).j;
let hA = await hist(A), hB = await hist(B);
const msgsA = hA.messages ?? [], msgsB = hB.messages ?? [];
step("C4 historique : A et B retrouvent la Deal Room X (messages présents des deux côtés)", msgsA.length > 0 && msgsB.length > 0, `A=${msgsA.length}, B=${msgsB.length}`);
step("C4b historique : aucun message d'un autre thread", [...msgsA, ...msgsB].every((m) => !m.thread_id || m.thread_id === thread), `threads vus = ${[...new Set([...msgsA, ...msgsB].map((m) => m.thread_id).filter(Boolean))].join(",") || "(non exposé)"}`);

// Négociation → accord → préparation : chaque réponse doit porter thread_id = X.
const stages = [
  ["proposition", A, { action: "offer", idem: `o1-${run}`, thread_id: thread, negotiation_id: neg, article_id: article, amount: 75000, confirmed: true }],
  ["contre_proposition", B, { action: "offer", idem: `o2-${run}`, thread_id: thread, negotiation_id: neg, article_id: article, amount: 85000, confirmed: true }],
  ["accord", A, { action: "accept", idem: `ac-${run}`, negotiation_id: neg, thread_id: thread }],
];
let deal = null;
for (const [name, who, body] of stages) {
  r = await call("waouh-commerce-action", who, body); seen(name, r); if (r.j.deal_id) deal = r.j.deal_id;
  step(`T-${name} : réponse ok et thread_id = X`, r.status === 200 && r.j.ok === true && r.j.thread_id === thread, `http ${r.status}, ok=${r.j.ok}, thread ${r.j.thread_id === thread ? "= X" : "≠ X (" + r.j.thread_id + ")"}, étape=${r.j.stage}`);
}
step("T-accord : le deal est créé", !!deal, `deal=${deal}`);
r = await call("waouh-commerce-action", B, { action: "seller_confirm", idem: `sc-${run}`, deal_id: deal }); seen("confirmation_vendeur", r);
step("T-confirmation vendeur : ok et thread_id = X", r.status === 200 && r.j.ok === true && r.j.thread_id === thread, `http ${r.status}, thread ${r.j.thread_id === thread ? "= X" : "≠ X (" + r.j.thread_id + ")"}`);
r = await call("waouh-commerce-action", A, { action: "pay_mode", idem: `pm-${run}`, deal_id: deal, method: "cash" }); seen("preparation", r);
step("T-préparation : ok et thread_id = X", r.status === 200 && r.j.ok === true && r.j.thread_id === thread, `http ${r.status}, étape=${r.j.stage}, thread ${r.j.thread_id === thread ? "= X" : "≠ X (" + r.j.thread_id + ")"}`);
for (const id of ["Livreur", "Livraison", "Paiement", "Clôture"]) console.log(`SKIP ${id} — NON EXÉCUTÉ (compte admin de test requis pour l'étape livreur)`);
hA = await hist(A); hB = await hist(B);
step("T-final : l'historique des deux côtés reste sur X", (hA.messages?.length ?? 0) > 0 && [...(hA.messages ?? []), ...(hB.messages ?? [])].every((m) => !m.thread_id || m.thread_id === thread), `A=${hA.messages?.length}, B=${hB.messages?.length}`);
console.log(JSON.stringify({ article, thread, neg, deal, X }));
console.log(`\n${results.filter((x) => x.ok).length}/${results.length} étapes passées`);
if (errors.length) { console.log("ERREURS :"); for (const e of errors) console.log(` - [${e.severity}] ${e.id} : ${e.detail}`); }
process.exit(errors.length ? 1 : 0);
