// Avatar guide — VRAIE fonction waouh-avatar-briefing du projet de test : préférences, accueil, point manuel, isolation, sécurité.
// Variables : SB_URL, SB_ANON, PW. Refuse tout projet autre que le projet de test.
const { SB_URL, SB_ANON } = process.env;
const PW = JSON.parse(process.env.PW || "{}");
if (!SB_URL?.includes("ljzwqyzaovnandpyfpgc")) { console.error("Refus : ce script ne cible que botbj-test-e2e."); process.exit(2); }
const login = async (email) => (await (await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PW[email] }) })).json()).access_token;
const B = { email: "acheteur.b.test@botbj-test.invalid" }, S = { email: "vendeur.a.test@botbj-test.invalid" };
B.t = await login(B.email); S.t = await login(S.email);
if (!B.t || !S.t) throw new Error("login refusé");
const call = async (bearer, body) => {
  const r = await fetch(`${SB_URL}/functions/v1/waouh-avatar-briefing`, { method: "POST", headers: { apikey: SB_ANON, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let j; try { j = await r.json(); } catch { j = {}; } return { status: r.status, j };
};
const results = [];
const check = (id, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? " — " + detail : ""}`); };

let r = await call(SB_ANON, { action: "get_prefs" });
check("G1 sans jeton d'utilisateur : refus", r.status === 401, `${r.status} ${r.j.code}`);
r = await call(B.t, { action: "tick" });
check("G2 le tick est réservé à la clé service", r.status === 401 && r.j.code === "service_role_required", `${r.status} ${r.j.code}`);
r = await call(B.t, { action: "n_importe_quoi" });
check("G3 action inconnue → 400", r.status === 400, `${r.status}`);

r = await call(B.t, { action: "set_prefs", prefs: { cadence: "every_4h", welcome: true, quiet_start: 22, quiet_end: 6 } });
check("G4 réglages enregistrés (cadence 4 h, heures calmes 22 h → 6 h)", r.j.ok && r.j.prefs?.cadence === "every_4h" && r.j.prefs?.quiet_start === 22 && r.j.prefs?.quiet_end === 6, JSON.stringify(r.j.prefs));
r = await call(B.t, { action: "set_prefs", prefs: { cadence: "toutes-les-secondes", quiet_start: 99, welcome: "oui" } });
check("G5 valeurs invalides ignorées : les réglages précédents sont conservés", r.j.ok && r.j.prefs?.cadence === "every_4h" && r.j.prefs?.quiet_start === 22 && r.j.prefs?.welcome === true, JSON.stringify(r.j.prefs));
r = await call(B.t, { action: "set_prefs", prefs: { last_briefing_at: "2000-01-01T00:00:00Z", auth_user_id: "00000000-0000-4000-8000-000000000000" } });
check("G6 les champs de suivi et l'identifiant ne sont pas modifiables par le client", r.j.ok && r.j.prefs?.last_briefing_at !== "2000-01-01T00:00:00.000Z", `${r.j.prefs?.last_briefing_at}`);
const other = await call(S.t, { action: "get_prefs" });
check("G7 isolation : le vendeur a ses propres réglages (défauts), pas ceux de l'acheteur", other.j.ok && other.j.prefs?.cadence === "daily" && other.j.prefs?.quiet_start === 21, JSON.stringify(other.j.prefs));

r = await call(B.t, { action: "now", session_id: "sess-guide-test-1" });
const b = r.j.briefing;
check("G8 « Faire le point » : envoyé, 2 à 3 phrases, boutons (3 au plus), sections, astuce d'aide", r.j.ok && r.j.sent === true && b && b.sentences.length >= 2 && b.sentences.length <= 3 && b.actions.length >= 1 && b.actions.length <= 3 && b.sections.length >= 1 && b.tip, `${b?.sentences?.length} phrases, ${b?.actions?.length} boutons`);
check("G9 le point reflète l'activité réelle de l'acheteur (offres transmises, veilles ou commandes du projet de test)", b && /offre|veille|commande|vente|Rien en cours/.test(b.sentences[1]), b?.sentences?.[1]);
check("G10 aucun montant ni coordonnée dans le texte", b && !/FCFA|\d{6,}|@|\+229/.test(b.sentences.join(" ")), b?.sentences?.join(" ").slice(0, 100));
check("G11 le message est écrit dans le chat de l'utilisateur (id renvoyé, intention avatar_briefing)", r.j.message?.id && r.j.message?.meta?.intent === "avatar_briefing" && r.j.message?.direction === "out", `${r.j.message?.meta?.intent}`);

r = await call(B.t, { action: "open", session_id: "sess-guide-test-1" });
check("G12 ouverture juste après un point : pas de doublon (moins de 30 min)", r.j.ok && r.j.sent === false && r.j.reason === "too_soon", `${r.j.sent} ${r.j.reason}`);
r = await call(B.t, { action: "set_prefs", prefs: { welcome: false } });
r = await call(B.t, { action: "open", session_id: "sess-guide-test-1" });
check("G13 accueil désactivé : rien à l'ouverture", r.j.ok && r.j.sent === false && r.j.reason === "welcome_off", `${r.j.reason}`);
r = await call(B.t, { action: "now" });
check("G14 le point manuel reste possible même accueil coupé", r.j.ok && r.j.sent === true, `${r.j.reason}`);
await call(B.t, { action: "set_prefs", prefs: { welcome: true, cadence: "daily", quiet_start: 21, quiet_end: 7 } });
console.log(`\n${results.filter(Boolean).length}/${results.length} PASS`);
process.exit(results.every(Boolean) ? 0 : 1);
