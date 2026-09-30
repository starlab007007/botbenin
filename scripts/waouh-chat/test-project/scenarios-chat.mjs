// Batterie de scénarios du chat WAOUH — VRAIES edge functions du projet de test (botbj-test-e2e).
// Comptes : S1, S2 (vendeurs) ; B1, B2, B3 (acheteurs) ; ADM (admin de test pour la livraison).
// Variables : SB_URL, SB_ANON, PW (JSON email→mot de passe). Refuse tout projet autre que le projet de test.
const { SB_URL, SB_ANON } = process.env;
const PW = JSON.parse(process.env.PW || "{}");
if (!SB_URL?.includes("ljzwqyzaovnandpyfpgc")) { console.error("Refus : ce script ne cible que botbj-test-e2e."); process.exit(2); }
const run = Date.now().toString(36);
const mk = (name, email, uid) => ({ name, email, uid, sid: `sess${name}-${run}` });
const S1 = mk("S1", "vendeur.a.test@botbj-test.invalid", "11111111-1111-4111-8111-111111111111");
const S2 = mk("S2", "vendeur.e.test@botbj-test.invalid", "77777777-7777-4777-8777-777777777777");
const B1 = mk("B1", "acheteur.b.test@botbj-test.invalid", "22222222-2222-4222-8222-222222222222");
const B2 = mk("B2", "acheteur.c.test@botbj-test.invalid", "55555555-5555-4555-8555-555555555555");
const B3 = mk("B3", "acheteur.d.test@botbj-test.invalid", "66666666-6666-4666-8666-666666666666");
const ADM = mk("ADM", "admin.test@botbj-test.invalid", "33333333-3333-4333-8333-333333333333");
for (const u of [S1, S2, B1, B2, B3, ADM]) {
  if (u === ADM && !PW[u.email]) { u.t = null; console.log("ADM : aucun mot de passe fourni — les scénarios de livraison seront NON EXÉCUTÉS"); continue; }
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, password: PW[u.email] }) });
  const j = await r.json(); if (!j.access_token) throw new Error(`login ${u.email}: ${JSON.stringify(j).slice(0, 90)}`); u.t = j.access_token;
}
const raw = async (fn, bearer, body, sid, extraHeaders = {}) => {
  const r = await fetch(`${SB_URL}/functions/v1/${fn}`, { method: "POST", headers: { apikey: SB_ANON, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json", ...(sid ? { "x-waouh-session": sid } : {}), ...extraHeaders }, body: JSON.stringify(body) });
  let j; try { j = await r.json(); } catch { j = {}; } return { status: r.status, j };
};
let seq = 0;
const cold = [];
const act = async (who, body) => {
  const r = await raw("waouh-commerce-action", who.t, { idem: `${who.name}-${run}-${++seq}`, ...body, session_id: who.sid }, who.sid);
  const j = r.j, n = (j.actions ?? []).length;
  // Fenêtre froide : réponse réussie dans un état actif, sans aucun bouton pour l'acteur (hors fin de vente et hors vendeur avant toute offre).
  if (r.status === 200 && j.ok === true && n === 0 && j.stage !== "payment" && !(j.role === "seller" && j.stage === "interest") && body.action !== "cancel") cold.push(`${who.name}/${body.action}/${j.stage}/${j.reply?.key}`);
  return r;
};
const publish = async (seller, title, price) => (await raw("waouh-status-publish", seller.t, { type: "sell", title: `${title} ${run}`, caption: "scénario", price_fcfa: price, location: "Cotonou" }, seller.sid)).j.article_id;
const hist = async (who, role, thread, article) => {
  const r = await raw("waouh-match-history", who.t, { article_id: article, thread_id: thread, auth_user_id: who.uid, role, limit: 200 }, who.sid);
  return { status: r.status, ok: r.j.ok === true, msgs: (r.j.messages || []).map((m) => ({ dir: m.direction, text: String(m.text ?? ""), actions: (m.meta?.actions ?? m.actions ?? []).map((a) => String(a.id ?? a).split(":")[0]) })) };
};
const has = (h, re) => h.msgs.some((m) => re.test(m.text));
const digits = (s) => String(s).replace(/\D/g, "");
const hasAmount = (h, n) => h.msgs.some((m) => digits(m.text).includes(String(n)));
const results = [], articles = [];
let current = "";
const scenario = (name) => { current = name; console.log(`\n## ${name}`); };
const check = (id, ok, detail = "", severity = "bloquant") => { results.push({ sc: current, id, ok, detail, severity }); console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? " — " + detail : ""}`); };
const key = (r) => r.j.reply?.key ?? r.j.code ?? "";
const deliver = async (deal) => { await raw("waouh-deal-ops", ADM.t, { action: "status", deal_id: deal, status: "picked_up" }, ADM.sid); return raw("waouh-deal-ops", ADM.t, { action: "status", deal_id: deal, status: "delivered" }, ADM.sid); };
const newArticle = async (seller, title, price) => { const a = await publish(seller, title, price); articles.push(a); return a; };

// ---------------------------------------------------------------- 1. Plusieurs acheteurs, un vendeur
scenario("1. Trois acheteurs s'intéressent au même article d'un seul vendeur");
let art = await newArticle(S1, "TEST Vélo", 300000);
const o1 = await act(B1, { action: "open_deal", article_id: art }), o2 = await act(B2, { action: "open_deal", article_id: art }), o3 = await act(B3, { action: "open_deal", article_id: art });
const T = [o1, o2, o3].map((o) => o.j.thread_id), N = [o1, o2, o3].map((o) => o.j.negotiation_id);
check("1a trois fils distincts, trois négociations distinctes", [o1, o2, o3].every((o) => o.j.ok) && new Set(T).size === 3 && new Set(N).size === 3, `fils=${new Set(T).size}, négociations=${new Set(N).size}`);
let hs = await Promise.all(T.map((t) => hist(S1, "seller", t, art)));
check("1b le vendeur reçoit une notification « Nouvel acheteur » dans chacun des 3 fils", hs.every((h) => has(h, /Nouvel acheteur/)), hs.map((h) => h.msgs.length).join("/") + " messages");
check("1c le vendeur a les boutons de décision dans chaque fil", hs.every((h) => h.msgs.some((m) => m.actions.includes("accepter"))), "");
const cross = await Promise.all([hist(B2, "buyer", T[0], art), hist(B1, "buyer", T[1], art), hist(B3, "buyer", T[0], art)]);
check("1d isolation : un acheteur ne lit pas le fil d'un autre acheteur", cross.every((h) => !h.ok || h.msgs.length === 0), cross.map((h) => `${h.status}/${h.msgs.length}`).join(" "), "sécurité");
await Promise.all([act(B1, { action: "offer", thread_id: T[0], negotiation_id: N[0], amount: 250000 }), act(B2, { action: "offer", thread_id: T[1], negotiation_id: N[1], amount: 260000 }), act(B3, { action: "offer", thread_id: T[2], negotiation_id: N[2], amount: 270000 })]);
hs = await Promise.all(T.map((t) => hist(S1, "seller", t, art)));
check("1e chaque fil du vendeur ne montre que l'offre de son acheteur", hasAmount(hs[0], 250000) && !hasAmount(hs[0], 260000) && !hasAmount(hs[0], 270000) && hasAmount(hs[1], 260000) && !hasAmount(hs[1], 250000) && hasAmount(hs[2], 270000) && !hasAmount(hs[2], 250000), "");

scenario("2. Le vendeur accepte deux acheteurs en même temps (course)");
const [ra, rb] = await Promise.all([act(S1, { action: "accept", thread_id: T[0], negotiation_id: N[0] }), act(S1, { action: "accept", thread_id: T[1], negotiation_id: N[1] })]);
const wins = [ra, rb].filter((r) => r.j.ok && r.j.deal_id);
check("2a un seul deal est créé pour l'article", wins.length === 1, `ok=${[ra, rb].map((r) => r.j.ok).join("/")}, clés=${[ra, rb].map(key).join("/")}`);
const loserIdx = ra.j.ok && ra.j.deal_id ? 1 : 0, winIdx = 1 - loserIdx;
check("2b le perdant reçoit un refus explicite « réservé/vendu »", !!wins.length && /article_(reserved|sold)/.test(key([ra, rb][loserIdx])), `clé=${key([ra, rb][loserIdx])}`, "majeur");
const hEv = await hist(B3, "buyer", T[2], art);
check("2c l'acheteur évincé (B3, fil intact) est prévenu dès l'accord d'un autre acheteur", has(hEv, /r[ée]serv|plus disponible|vendu|indisponible|un autre acheteur/i), `dernier message de B3 : « ${(hEv.msgs.at(-1)?.text ?? "").replace(/\s+/g, " ").slice(0, 70)} »`, "majeur");
const hsEv = await hist(S1, "seller", T[2], art);
check("2d les boutons « Accepter » périmés du vendeur sont retirés du fil évincé", !hsEv.msgs.some((m) => m.actions.includes("accepter")), `boutons restants : ${hsEv.msgs.flatMap((m) => m.actions).join(",") || "aucun"}`, "majeur");
const winnerBuyer = [B1, B2][winIdx], loserBuyer = [B1, B2][loserIdx], winnerThread = T[winIdx], loserThread = T[loserIdx], winnerDeal = [ra, rb][winIdx].j.deal_id;

scenario("3. Après l'accord avec un acheteur, les autres ne peuvent plus acheter");
let r = await act(B3, { action: "offer", thread_id: T[2], negotiation_id: N[2], amount: 280000 });
check("3a un acheteur en attente ne peut plus renchérir", r.j.ok === false, `clé=${key(r)}`);
r = await act(S1, { action: "accept", thread_id: T[2], negotiation_id: N[2] });
check("3b le vendeur ne peut pas accepter un 2e acheteur", r.j.ok === false && /article_(reserved|sold)|out_of_stage|stale/.test(key(r)), `clé=${key(r)}`);
r = await act(B3, { action: "open_deal", article_id: art });
check("3c ouvrir l'article réservé est refusé", r.j.ok === false && key(r) === "article_reserved", `clé=${key(r)}`);

scenario("4. Annulation par l'acheteur retenu puis reprise par un autre acheteur");
r = await act(winnerBuyer, { action: "cancel", deal_id: winnerDeal });
check("4a l'acheteur annule la commande", r.j.ok === true, `clé=${key(r)}`);
const hRe = await hist(B3, "buyer", T[2], art);
check("4d l'acheteur évincé (B3) est prévenu que l'article est de nouveau disponible, avec des boutons", has(hRe, /De nouveau disponible/) && hRe.msgs.some((m) => m.actions.includes("je-veux")), `dernier : « ${(hRe.msgs.at(-1)?.text ?? "").replace(/\s+/g, " ").slice(0, 60)} » boutons=${hRe.msgs.at(-1)?.actions.join(",")}`, "majeur");
r = await act(loserBuyer, { action: "offer", thread_id: loserThread, negotiation_id: [N[0], N[1]][loserIdx], amount: 255000 });
check("4b l'article revient à la vente : un autre acheteur peut de nouveau négocier", r.j.ok === true, `clé=${key(r)}`, "majeur");
r = await act(S1, { action: "accept", thread_id: loserThread, negotiation_id: [N[0], N[1]][loserIdx] });
check("4c le vendeur peut alors accepter l'autre acheteur (nouveau deal)", r.j.ok === true && !!r.j.deal_id && r.j.deal_id !== winnerDeal, `ok=${r.j.ok}, clé=${key(r)}`, "majeur");

// ---------------------------------------------------------------- 5. Un acheteur, plusieurs vendeurs
scenario("5. Un acheteur négocie avec deux vendeurs en parallèle");
const artS1 = await newArticle(S1, "TEST Table", 100000), artS2 = await newArticle(S2, "TEST Chaise", 80000);
const [p1, p2] = await Promise.all([act(B1, { action: "open_deal", article_id: artS1 }), act(B1, { action: "open_deal", article_id: artS2 })]);
check("5a deux fils distincts pour deux vendeurs", p1.j.ok && p2.j.ok && p1.j.thread_id !== p2.j.thread_id, "");
const [h1, h2] = await Promise.all([hist(S1, "seller", p1.j.thread_id, artS1), hist(S2, "seller", p2.j.thread_id, artS2)]);
check("5b chaque vendeur est notifié de son propre article seulement", has(h1, /Nouvel acheteur/) && has(h2, /Nouvel acheteur/) && !has(h1, /Chaise/) && !has(h2, /Table/), "");
const xs = await Promise.all([hist(S2, "seller", p1.j.thread_id, artS1), hist(S1, "seller", p2.j.thread_id, artS2)]);
check("5c un vendeur ne lit pas le fil de l'autre vendeur", xs.every((h) => !h.ok || h.msgs.length === 0), xs.map((h) => `${h.status}/${h.msgs.length}`).join(" "), "sécurité");
await act(B1, { action: "offer", thread_id: p1.j.thread_id, negotiation_id: p1.j.negotiation_id, amount: 90000 });
await act(B1, { action: "offer", thread_id: p2.j.thread_id, negotiation_id: p2.j.negotiation_id, amount: 70000 });
const [ac, rj] = await Promise.all([act(S1, { action: "accept", thread_id: p1.j.thread_id, negotiation_id: p1.j.negotiation_id }), act(S2, { action: "reject", thread_id: p2.j.thread_id, negotiation_id: p2.j.negotiation_id })]);
check("5d S1 accepte (deal), S2 refuse : décisions indépendantes", ac.j.ok && !!ac.j.deal_id && rj.j.ok, `accept=${key(ac)} refus=${key(rj)}`);
r = await act(B1, { action: "offer", thread_id: p2.j.thread_id, negotiation_id: p2.j.negotiation_id, amount: 75000 });
check("5e après refus du vendeur 2, l'acheteur peut refaire une offre", r.j.ok === true, `ok=${r.j.ok}, clé=${key(r)}`, "majeur");
if (r.j.ok) {
  const rr = await act(S2, { action: "accept", thread_id: r.j.thread_id ?? p2.j.thread_id, negotiation_id: r.j.negotiation_id ?? p2.j.negotiation_id });
  check("5f le vendeur 2 accepte la nouvelle offre → deal", rr.j.ok === true && !!rr.j.deal_id, `ok=${rr.j.ok}, clé=${key(rr)}`, "majeur");
}

// ---------------------------------------------------------------- 6. Doublons et idempotence
scenario("6. Double clic « Intéressé » et idempotence");
art = await newArticle(S1, "TEST Montre", 50000);
const d1 = await act(B1, { action: "open_deal", article_id: art }), d2 = await act(B1, { action: "open_deal", article_id: art });
check("6a deux « Intéressé » = même fil, même négociation", d1.j.thread_id === d2.j.thread_id && d1.j.negotiation_id === d2.j.negotiation_id, "");
const hd = await hist(S1, "seller", d1.j.thread_id, art);
check("6b le vendeur n'est notifié qu'une fois", hd.msgs.filter((m) => /Nouvel acheteur/.test(m.text)).length === 1, `${hd.msgs.filter((m) => /Nouvel acheteur/.test(m.text)).length} notification(s)`, "majeur");
const fixed = `fixe-${run}-1`;
const i1 = await raw("waouh-commerce-action", B1.t, { idem: fixed, action: "offer", thread_id: d1.j.thread_id, negotiation_id: d1.j.negotiation_id, amount: 40000, session_id: B1.sid }, B1.sid);
const i2 = await raw("waouh-commerce-action", B1.t, { idem: fixed, action: "offer", thread_id: d1.j.thread_id, negotiation_id: d1.j.negotiation_id, amount: 40000, session_id: B1.sid }, B1.sid);
check("6c même clé idem rejouée : réponse identique, marquée replayed", i2.j.replayed === true && i1.j.ok === true, `replayed=${i2.j.replayed}`);
const hd2 = await hist(S1, "seller", d1.j.thread_id, art);
check("6d le rejeu n'écrit pas de 2e message d'offre chez le vendeur", hd2.msgs.filter((m) => digits(m.text).includes("40000")).length === 1, `${hd2.msgs.filter((m) => digits(m.text).includes("40000")).length} message(s) à 40 000`);
const i3 = await raw("waouh-commerce-action", B2.t, { idem: fixed, action: "offer", thread_id: d1.j.thread_id, amount: 41000, session_id: B2.sid }, B2.sid);
check("6e même clé idem par un autre utilisateur = 409 idem_conflict", i3.status === 409 && i3.j.code === "idem_conflict", `http ${i3.status}, ${i3.j.code}`, "sécurité");
const cc = `conc-${run}`;
const [c1, c2] = await Promise.all([1, 2].map(() => raw("waouh-commerce-action", B1.t, { idem: cc, action: "offer", thread_id: d1.j.thread_id, negotiation_id: d1.j.negotiation_id, amount: 39000, session_id: B1.sid }, B1.sid)));
check("6f même clé en parallèle : une seule exécution (l'autre rejoue ou attend)", [c1, c2].filter((x) => x.status === 200 && x.j.ok === true && !x.j.replayed).length === 1, `http ${c1.status}/${c2.status}, codes ${c1.j.code ?? "ok"}/${c2.j.code ?? "ok"}`);

// ---------------------------------------------------------------- 7. Règles de tour et de rôle
scenario("7. Règles de tour, de rôle et de montant");
art = await newArticle(S1, "TEST Radio", 60000);
const t0 = await act(B1, { action: "open_deal", article_id: art });
r = await act(S1, { action: "open_deal", article_id: art });
check("7a le vendeur ne peut pas s'intéresser à son propre article", r.j.ok === false && /self|out_of_stage/.test(key(r)), `clé=${key(r)}`);
await act(B1, { action: "offer", thread_id: t0.j.thread_id, negotiation_id: t0.j.negotiation_id, amount: 50000 });
r = await act(B1, { action: "accept", thread_id: t0.j.thread_id, negotiation_id: t0.j.negotiation_id });
check("7b l'acheteur ne peut pas accepter sa propre offre : aucun deal, message d'attente", !r.j.deal_id && key(r) === "awaiting_counterparty", `ok=${r.j.ok}, clé=${key(r)}`);
for (const [label, amount] of [["zéro", 0], ["négatif", -5], ["gigantesque", 1e12], ["texte", "abc"]]) {
  r = await act(B1, { action: "offer", thread_id: t0.j.thread_id, negotiation_id: t0.j.negotiation_id, amount });
  check(`7c montant ${label} refusé (400)`, r.status === 400, `http ${r.status}, ${r.j.code ?? ""}`);
}
r = await act(B1, { action: "offer", thread_id: t0.j.thread_id });
check("7d offre sans montant = 400 amount_required", r.status === 400 && r.j.code === "amount_required", `http ${r.status}, ${r.j.code}`);
r = await raw("waouh-commerce-action", B1.t, { idem: `bad-${run}`, action: "voler", session_id: B1.sid }, B1.sid);
check("7e action inconnue = 400", r.status === 400, `http ${r.status}, ${r.j.code}`);
r = await raw("waouh-commerce-action", B1.t, { idem: "court", action: "open_deal", article_id: art, session_id: B1.sid }, B1.sid);
check("7f clé idem trop courte = 400", r.status === 400 && r.j.code === "idem_required", `http ${r.status}, ${r.j.code}`);
r = await act(B1, { action: "open_deal", article_id: "00000000-0000-4000-8000-000000000000" });
check("7g article inexistant : message « article introuvable »", r.j.ok === false && /article_missing|technical/.test(key(r)), `clé=${key(r)}`);
r = await act(B1, { action: "offer", thread_id: t0.j.thread_id, negotiation_id: t0.j.negotiation_id, amount: 90000 });
check("7h offre supérieure au prix affiché (90 000 > 60 000) : comportement constaté", true, `ok=${r.j.ok}, clé=${key(r)} — à décider avec le métier`, "info");
r = await act(S1, { action: "seller_confirm", deal_id: "00000000-0000-4000-8000-000000000000" });
check("7i confirmer un deal inexistant : refusé", r.j.ok === false || r.status >= 400, `http ${r.status}, clé=${key(r)}`);
r = await act(B3, { action: "accept", thread_id: t0.j.thread_id, negotiation_id: t0.j.negotiation_id });
check("7j un tiers n'ayant aucun lien avec le fil est refusé (403)", r.status === 403, `http ${r.status}, ${r.j.code}`, "sécurité");
r = await act(B3, { action: "offer", thread_id: t0.j.thread_id, amount: 30000 });
check("7k un tiers ne peut pas faire d'offre dans le fil d'autrui (403)", r.status === 403, `http ${r.status}, ${r.j.code}`, "sécurité");
r = await raw("waouh-commerce-action", SB_ANON, { idem: `anon-${run}`, action: "open_deal", article_id: art, session_id: "web_anonyme_1" }, null);
check("7l sans identité (jeton anonyme, sans en-tête de session) = 403", r.status === 403, `http ${r.status}, ${r.j.code}`, "sécurité");
r = await raw("waouh-commerce-action", "jeton.invalide.xyz", { idem: `bad2-${run}`, action: "open_deal", article_id: art, session_id: "web_x_1" }, null);
check("7m jeton invalide = refusé", r.status >= 400, `http ${r.status}`, "sécurité");

// ---------------------------------------------------------------- 8. Négociation longue et refus
scenario("7bis. Aucune fenêtre froide : boutons quand on attend l'autre partie");
art = await newArticle(S1, "TEST Guitare", 90000);
const w0 = await act(B1, { action: "open_deal", article_id: art });
const ids = (rr) => (rr.j.actions ?? []).map((a) => String(a.id).split(":")[0]);
check("7bis-a acheteur qui attend le vendeur : « Modifier mon offre » + « Poser une question »", ids(w0).includes("proposer-prix") && ids(w0).includes("poser-question"), `boutons=${ids(w0)}`, "majeur");
const W = { thread_id: w0.j.thread_id, negotiation_id: w0.j.negotiation_id };
const w1 = await act(B1, { action: "offer", ...W, amount: 80000 });
check("7bis-b après une offre, l'acheteur garde des boutons d'action", ids(w1).length >= 1, `boutons=${ids(w1)}`, "majeur");
const w2 = await act(S1, { action: "accept", ...W });
check("7bis-c le vendeur, accord conclu : bouton « Article disponible »", ids(w2).some((k) => k.startsWith("confirmer-disponibilite")), `boutons=${ids(w2)}`, "majeur");
const w3 = await act(S1, { action: "seller_confirm", deal_id: w2.j.deal_id });
check("7bis-d le vendeur, après confirmation : « Poser une question » (plus de liste vide)", ids(w3).includes("poser-question"), `boutons=${ids(w3)}`, "majeur");
const w4 = await act(B1, { action: "pay_mode", deal_id: w2.j.deal_id, method: "cash" });
check("7bis-e l'acheteur, livreur assigné : bouton d'échange disponible", ids(w4).length >= 1, `étape=${w4.j.stage}, boutons=${ids(w4)}`, "majeur");
const w5 = await act(B2, { action: "open_deal", article_id: art });
check("7bis-f article réservé, acheteur non concerné : refus explicite et aucun bouton qui échouerait", w5.j.ok === false && ids(w5).length === 0, `clé=${key(w5)}, boutons=${ids(w5)}`, "majeur");

scenario("8. Négociation en plusieurs tours puis accord au dernier prix");
art = await newArticle(S1, "TEST Ordinateur", 300000);
const g = await act(B1, { action: "open_deal", article_id: art });
const G = { thread_id: g.j.thread_id, negotiation_id: g.j.negotiation_id };
const steps = [[B1, 250000], [S1, 280000], [B1, 260000], [S1, 270000]];
let allOk = true; for (const [who, amount] of steps) { const x = await act(who, { action: "offer", ...G, amount }); allOk = allOk && x.j.ok === true; }
check("8a quatre tours d'offres et contre-offres acceptés", allOk, "");
const hb = await hist(B1, "buyer", G.thread_id, art);
check("8b l'acheteur voit la dernière contre-offre (270 000) avec le bouton Accepter", hasAmount({ msgs: hb.msgs.slice(-3) }, 270000) && hb.msgs.slice(-3).some((m) => m.actions.includes("accepter")), "");
r = await act(B1, { action: "accept", ...G });
check("8c l'acheteur accepte : deal au dernier prix", r.j.ok === true && !!r.j.deal_id, `clé=${key(r)}`);
const deal8 = r.j.deal_id;
r = await act(B1, { action: "pay_mode", deal_id: deal8, method: "mobile_money" });
check("8d paiement avant confirmation vendeur : comportement constaté", true, `ok=${r.j.ok}, clé=${key(r)}, étape=${r.j.stage}`, "info");

scenario("9. Refus du vendeur puis nouvelle offre");
art = await newArticle(S1, "TEST Casque", 40000);
const q = await act(B1, { action: "open_deal", article_id: art });
const Q = { thread_id: q.j.thread_id, negotiation_id: q.j.negotiation_id };
await act(B1, { action: "offer", ...Q, amount: 20000 });
r = await act(S1, { action: "reject", ...Q });
check("9a le vendeur refuse l'offre", r.j.ok === true, `clé=${key(r)}`);
const hq = await hist(B1, "buyer", Q.thread_id, art);
check("9b l'acheteur est informé du refus", has(hq, /refus/i), `dernier : « ${(hq.msgs.at(-1)?.text ?? "").replace(/\s+/g, " ").slice(0, 70)} »`, "majeur");
r = await act(B1, { action: "accept", ...Q });
check("9c un bouton périmé (accepter après refus) est refusé", r.j.ok === false && !r.j.deal_id, `clé=${key(r)}`);
r = await act(B1, { action: "offer", ...Q, amount: 35000 });
check("9d nouvelle offre après refus acceptée", r.j.ok === true, `ok=${r.j.ok}, clé=${key(r)}`, "majeur");

// ---------------------------------------------------------------- 10. Questions
scenario("10. Questions acheteur ↔ vendeur");
art = await newArticle(S1, "TEST Appareil photo", 120000);
r = await act(B1, { action: "ask", article_id: art, text: "Est-il garanti ?" });
check("10a l'acheteur pose une question sans offre", r.j.ok === true && !!r.j.thread_id, `clé=${key(r)}`);
const ask = { thread_id: r.j.thread_id };
let hv = await hist(S1, "seller", ask.thread_id, art);
check("10b le vendeur reçoit la question", has(hv, /garanti/i), `${hv.msgs.length} message(s)`);
r = await act(S1, { action: "ask", ...ask, article_id: art, text: "Oui, 1 an." });
check("10c le vendeur répond dans le fil", r.j.ok === true, `clé=${key(r)}`);
const hbq = await hist(B1, "buyer", ask.thread_id, art);
check("10d l'acheteur reçoit la réponse", has(hbq, /1 an/i), `${hbq.msgs.length} message(s)`);
r = await act(B3, { action: "ask", ...ask, text: "Puis-je lire ?" });
check("10e un tiers ne peut pas écrire dans ce fil (403)", r.status === 403, `http ${r.status}`, "sécurité");

// ---------------------------------------------------------------- 11. Parcours complet mobile money + livraison
scenario("11. Vente complète en Mobile Money");
art = await newArticle(S2, "TEST Téléviseur", 200000);
const m = await act(B2, { action: "open_deal", article_id: art });
const M = { thread_id: m.j.thread_id, negotiation_id: m.j.negotiation_id };
await act(B2, { action: "offer", ...M, amount: 180000 });
r = await act(S2, { action: "accept", ...M });
const deal11 = r.j.deal_id;
check("11a accord", r.j.ok === true && !!deal11, "");
r = await act(B2, { action: "confirm_payment", deal_id: deal11, method: "mobile_money" });
check("11b paiement refusé avant livraison", r.j.ok === false, `clé=${key(r)}`);
r = await act(S2, { action: "seller_confirm", deal_id: deal11 });
check("11c le vendeur confirme", r.j.ok === true, `clé=${key(r)}`);
r = await act(B2, { action: "pay_mode", deal_id: deal11, method: "mobile_money" });
check("11d l'acheteur choisit Mobile Money", r.j.ok === true, `étape=${r.j.stage}`);
r = await act(B3, { action: "cancel", deal_id: deal11 });
check("11e un tiers ne peut pas annuler la commande", r.j.ok === false || r.status >= 400, `http ${r.status}, clé=${key(r)}`, "sécurité");
const dv = await deliver(deal11);
check("11f livraison par le livreur", dv.status === 200, `http ${dv.status}`);
r = await act(B2, { action: "confirm_payment", deal_id: deal11, method: "mobile_money" });
check("11g paiement confirmé → terminé", r.j.ok === true, `clé=${key(r)}`);
r = await act(B2, { action: "confirm_payment", deal_id: deal11, method: "mobile_money", });
check("11h double confirmation de paiement sans effet de bord", r.status === 200, `ok=${r.j.ok}, clé=${key(r)}`, "info");
r = await act(S2, { action: "cancel", deal_id: deal11 });
check("11i annuler une commande terminée est refusé", r.j.ok === false, `clé=${key(r)}`, "majeur");

scenario("Bilan des fenêtres froides");
check("Z aucune réponse réussie sans bouton dans un état actif", cold.length === 0, cold.length ? cold.slice(0, 8).join(" | ") : "0 sur toutes les actions de la batterie", "majeur");
console.log("\n=== BILAN ===");
const groups = {};
for (const x of results) (groups[x.sc] ||= []).push(x);
for (const [sc, xs] of Object.entries(groups)) console.log(`${xs.every((x) => x.ok) ? "OK  " : "KO  "} ${sc} : ${xs.filter((x) => x.ok).length}/${xs.length}`);
const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} vérifications passées`);
if (failed.length) { console.log("ÉCHECS :"); for (const x of failed) console.log(` - [${x.severity}] ${x.sc} / ${x.id} : ${x.detail}`); }
console.log("ARTICLES=" + JSON.stringify(articles));
process.exit(failed.length ? 1 : 0);
