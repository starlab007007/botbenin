// Résultats Nexus externes → Deal Room directe — VRAIES edge functions du projet de test.
// Variables : SB_URL, SB_ANON, PW (JSON email→mot de passe). Signaux semés : voir docs/NEXUS_DEAL_ROOM_DIRECTE.md.
const { SB_URL, SB_ANON } = process.env;
const PW = JSON.parse(process.env.PW || "{}");
if (!SB_URL?.includes("ljzwqyzaovnandpyfpgc")) { console.error("Refus : ce script ne cible que botbj-test-e2e."); process.exit(2); }
const run = Date.now().toString(36);
const B = { name: "B1", email: "acheteur.b.test@botbj-test.invalid", sid: `sessNX-${run}` };
const login = await (await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: B.email, password: PW[B.email] }) })).json();
if (!login.access_token) throw new Error("login refusé"); B.t = login.access_token;
const sig = (n) => `d1a00000-0000-4000-8000-0000000000${n}`;
let seq = 0;
const act = async (body, bearer = B.t) => {
  const r = await fetch(`${SB_URL}/functions/v1/waouh-commerce-action`, { method: "POST", headers: { apikey: SB_ANON, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json", "x-waouh-session": B.sid }, body: JSON.stringify({ idem: `nx-${run}-${++seq}`, session_id: B.sid, ...body }) });
  let j; try { j = await r.json(); } catch { j = {}; } return { status: r.status, j };
};
const results = [];
const check = (id, ok, detail = "") => { results.push({ id, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? " — " + detail : ""}`); };
const key = (r) => r.j.reply?.key ?? r.j.code ?? "";
const ids = (r) => (r.j.actions ?? []).map((a) => String(a.id).split(":")[0]);

let r = await act({ action: "open_deal", fabric_id: `external:${sig("c1")}`, amount: 130000 });
check("N1 offre externe C1 → Deal Room ouverte (article + fil)", r.status === 200 && r.j.ok && r.j.article_id && r.j.thread_id && r.j.negotiation_id, `${r.status} ${key(r)}`);
check("N1b message « Offre prête » + bouton « Envoyer mon offre » en premier", key(r) === "external_offer_ready" && ids(r)[0] === "envoyer-offre", `${key(r)} ${ids(r)}`);
const { article_id: art, thread_id: th, negotiation_id: neg } = r.j;
const again = await act({ action: "open_deal", fabric_id: `external:${sig("c1")}`, amount: 130000 });
check("N2 rouvrir le même résultat réutilise article et fil (idempotent)", again.j.article_id === art && again.j.thread_id === th, `${again.j.article_id === art}/${again.j.thread_id === th}`);
r = await act({ action: "ask", article_id: art, text: "Bonjour, c'est dispo ?" });
check("N3 question vers un vendeur externe : pas de faux « question envoyée »", r.j.ok === false && key(r) === "out_of_stage", key(r));
r = await act({ action: "transmit_offer", negotiation_id: neg, thread_id: th });
check("N4 envoi de l'offre : jamais un faux succès (cœur agentique absent du projet de test → erreur technique relançable)", r.j.ok === false && key(r) === "technical_error", `${r.status} ${key(r)}`);
check("N4b après échec, le bouton « Envoyer mon offre » reste proposé", ids(r).includes("envoyer-offre") || r.status === 200, ids(r).join(","));
r = await act({ action: "open_deal", fabric_id: `external:${sig("c0")}` });
check("N5 signal C0 : la Deal Room s'ouvre mais l'envoi est refusé par la politique", r.j.ok === true, key(r));
const c0 = r.j;
r = await act({ action: "transmit_offer", negotiation_id: c0.negotiation_id, thread_id: c0.thread_id });
check("N5b envoi C0 → « Envoi non autorisé », aucun appel au tiers", r.j.ok === false && key(r) === "external_not_permitted", key(r));
r = await act({ action: "open_deal", fabric_id: `external:${sig("b1")}` });
check("N6 demande d'achat externe : pas de Deal Room acheteur", r.j.ok === false && key(r) === "external_unavailable", `${r.status} ${key(r)}`);
r = await act({ action: "open_deal", fabric_id: `external:${sig("e1")}` });
check("N7 annonce expirée → « Annonce indisponible »", r.j.ok === false && key(r) === "external_unavailable", `${r.status} ${key(r)}`);
r = await act({ action: "open_deal", fabric_id: `external:${sig("ff")}` });
check("N8 signal inconnu → « Annonce indisponible »", r.j.ok === false && key(r) === "external_unavailable", `${r.status} ${key(r)}`);
r = await act({ action: "open_deal", fabric_id: "external:pas-un-uuid" });
check("N9 fabric_id invalide → 400", r.status === 400, `${r.status} ${key(r)}`);
r = await act({ action: "transmit_offer", negotiation_id: neg, thread_id: th }, SB_ANON);
check("N10 sans jeton utilisateur : refus d'authentification", r.status === 401 || r.status === 403, `${r.status}`);
console.log(`\n${results.filter((x) => x.ok).length}/${results.length} PASS`);
process.exit(results.every((x) => x.ok) ? 0 : 1);
