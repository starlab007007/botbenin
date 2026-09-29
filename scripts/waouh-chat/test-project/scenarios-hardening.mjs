// E7/E9 sur les VRAIES fonctions du projet de test : notify-dispatch réservé au service, publication observable,
// et non-régression de la notification vendeur (l'appel interne porte bien la clé service).
const { SB_URL, SB_ANON } = process.env;
const PW = JSON.parse(process.env.PW || "{}");
if (!SB_URL?.includes("ljzwqyzaovnandpyfpgc")) { console.error("Refus : ce script ne cible que botbj-test-e2e."); process.exit(2); }
const run = Date.now().toString(36);
const login = async (email) => (await (await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PW[email] }) })).json()).access_token;
const S = { email: "vendeur.a.test@botbj-test.invalid", sid: `sessS-${run}` }, B = { email: "acheteur.b.test@botbj-test.invalid", sid: `sessB-${run}` };
S.t = await login(S.email); B.t = await login(B.email);
const call = async (fn, bearer, body, sid) => {
  const r = await fetch(`${SB_URL}/functions/v1/${fn}`, { method: "POST", headers: { apikey: SB_ANON, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json", ...(sid ? { "x-waouh-session": sid } : {}) }, body: JSON.stringify(body) });
  let j; try { j = await r.json(); } catch { j = {}; } return { status: r.status, j };
};
const results = [];
const check = (id, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? " — " + detail : ""}`); };

let r = await call("waouh-notify-dispatch", SB_ANON, { kind: "new_buyer", article_id: "00000000-0000-4000-8000-000000000000", recipient: "seller" });
check("E9a notify-dispatch refuse la clé anon", r.status === 401 && r.j.code === "service_role_required", `${r.status} ${r.j.code}`);
r = await call("waouh-notify-dispatch", B.t, { kind: "new_buyer", article_id: "00000000-0000-4000-8000-000000000000", recipient: "seller" });
check("E9b notify-dispatch refuse le jeton d'un utilisateur", r.status === 401, `${r.status}`);
r = await call("waouh-notify-dispatch", "", { kind: "new_buyer" });
check("E9c notify-dispatch refuse un appel sans jeton", r.status === 401 || r.status === 400 || r.status === 403, `${r.status}`);

r = await call("waouh-status-publish", S.t, { type: "sell", title: `TEST durcissement ${run}`, caption: "E7", price_fcfa: 50000, location: "Cotonou" }, S.sid);
check("E7 la publication réussit ET rend l'issue du fan-out (buyers_notified)", r.status === 200 && r.j.ok === true && r.j.buyers_notified && typeof r.j.buyers_notified.ok === "boolean", JSON.stringify(r.j.buyers_notified));
const art = r.j.article_id;

r = await call("waouh-commerce-action", B.t, { action: "open_deal", idem: `hd-${run}-1`, article_id: art, session_id: B.sid }, B.sid);
check("N0 non-régression : Deal Room ouverte", r.status === 200 && r.j.ok === true && r.j.thread_id, `${r.status} ${r.j.reply?.key}`);
const hist = await call("waouh-match-history", S.t, { article_id: art, thread_id: r.j.thread_id, auth_user_id: null, role: "seller", limit: 50 }, S.sid);
const notified = (hist.j.messages || []).some((m) => /Nouvel acheteur/.test(String(m.text ?? "")));
check("N0b non-régression : le vendeur reçoit toujours « Nouvel acheteur » (appel interne authentifié par la clé service)", notified, `${(hist.j.messages || []).length} messages`);
console.log(`\n${results.filter(Boolean).length}/${results.length} PASS`);
process.exit(results.every(Boolean) ? 0 : 1);
