// Avatar : points d'avancement, synthèse, veille, relance — VRAIES edge functions du projet de test.
// Le cœur agentique y est remplacé par un double (stubs/waouh-studio-e2e-v21465). PHASE=1 puis (vieillissement SQL) PHASE=2.
import { readFileSync, writeFileSync } from "node:fs";
const { SB_URL, SB_ANON, PHASE = "1" } = process.env;
const PW = JSON.parse(process.env.PW || "{}");
if (!SB_URL?.includes("ljzwqyzaovnandpyfpgc")) { console.error("Refus : ce script ne cible que botbj-test-e2e."); process.exit(2); }
const STATE = "/tmp/scenarios-avatar-state.json";
const run = Date.now().toString(36);
const B = { email: "acheteur.b.test@botbj-test.invalid", sid: `sessAV-${run}` };
B.t = (await (await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: B.email, password: PW[B.email] }) })).json()).access_token;
if (!B.t) throw new Error("login refusé");
const sig = (n) => `d1a00000-0000-4000-8000-0000000000${(process.env.SIGSET === "2" ? { a1: "a3", a2: "a4" } : {})[n] ?? n}`;
let seq = 0;
const act = async (body) => {
  const r = await fetch(`${SB_URL}/functions/v1/waouh-commerce-action`, { method: "POST", headers: { apikey: SB_ANON, Authorization: `Bearer ${B.t}`, "Content-Type": "application/json", "x-waouh-session": B.sid }, body: JSON.stringify({ idem: `av-${run}-${++seq}`, session_id: B.sid, ...body }) });
  let j; try { j = await r.json(); } catch { j = {}; } return { status: r.status, j };
};
const results = [];
const check = (id, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? " — " + detail : ""}`); };
const key = (r) => r.j.reply?.key ?? r.j.code ?? "";
const ids = (r) => (r.j.actions ?? []).map((a) => String(a.id).split(":")[0]);
const states = (r) => (r.j.avatar?.progress ?? []).map((s) => s.state).join(",");

if (PHASE === "1") {
  // ---- A1 : C1 avec contact public : envoi possible
  let r = await act({ action: "open_deal", fabric_id: `external:${sig("a1")}`, amount: 130000 });
  const A1 = { article: r.j.article_id, thread: r.j.thread_id, neg: r.j.negotiation_id };
  check("V1 ouverture : stepper « Offre transmise » en cours (4/6), voie « envoi au tap »", r.j.ok && states(r) === "done,done,done,current,todo,todo" && r.j.avatar?.contact?.mode === "send_on_tap", `${states(r)} ${r.j.avatar?.contact?.mode}`);
  check("V1b boutons : Envoyer mon offre en premier", ids(r)[0] === "envoyer-offre", ids(r).join(","));
  r = await act({ action: "transmit_offer", negotiation_id: A1.neg, thread_id: A1.thread });
  check("V2 envoi réussi (cœur agentique de test) → « Offre transmise »", r.j.ok === true && key(r) === "external_offer_sent", `${r.status} ${key(r)}`);
  check("V2b synthèse de l'avatar : écart −13 %, posture réaliste, suivi programmé", r.j.avatar?.synthesis?.gapPct === -13 && r.j.avatar?.synthesis?.stance === "fair" && !!r.j.avatar?.synthesis?.nextFollowUpAt, JSON.stringify(r.j.avatar?.synthesis)?.slice(0, 120));
  check("V2c stepper : suivi actif, prochaine étape « Réponse du vendeur »", states(r) === "done,done,done,done,done,current", states(r));
  check("V2d plus de bouton d'envoi juste après l'envoi (modifier seulement)", !ids(r).includes("envoyer-offre") && ids(r).includes("proposer-prix"), ids(r).join(","));
  r = await act({ action: "transmit_offer", negotiation_id: A1.neg, thread_id: A1.thread });
  check("V3 double tap : aucun second envoi (« en attente de réponse »)", r.j.ok === true && key(r) === "awaiting_counterparty", key(r));
  r = await act({ action: "transmit_offer", negotiation_id: A1.neg, thread_id: A1.thread, follow_up: true });
  check("V4 relance trop tôt (< 24 h) → « Un peu tôt », sans envoi", r.j.ok === false && key(r) === "nudge_too_soon", key(r));

  // ---- A2 : C0 : aucune voie → l'avatar prend le relais (veille), jamais d'impasse
  r = await act({ action: "open_deal", fabric_id: `external:${sig("a2")}`, amount: 180000 });
  const A2 = { article: r.j.article_id, thread: r.j.thread_id, neg: r.j.negotiation_id };
  check("V5 C0 : Deal Room ouverte tout de suite, voie « veille », bouton « Garder en veille »", r.j.ok && r.j.avatar?.contact?.mode === "watch" && ids(r)[0] === "veille", `${r.j.avatar?.contact?.mode} ${ids(r)}`);
  r = await act({ action: "transmit_offer", negotiation_id: A2.neg, thread_id: A2.thread });
  check("V6 envoi impossible (C0) : pas de refus sec, l'avatar garde l'offre en veille", r.j.ok === true && key(r) === "avatar_watching" && ids(r).includes("proposer-prix") && !ids(r).includes("envoyer-offre"), `${key(r)} ${ids(r)}`);
  writeFileSync(STATE, JSON.stringify({ A1, A2, run }));
  console.log("\nphase 1 terminée");
} else {
  const { A1, A2 } = JSON.parse(readFileSync(STATE, "utf8"));
  // Phase 2 : après vieillissement SQL de l'envoi (30 h) et ouverture d'une voie de contact pour A2.
  let r = await act({ action: "transmit_offer", negotiation_id: A1.neg, thread_id: A1.thread, follow_up: true });
  check("V7 relance permise après 24 h → « Relance envoyée »", r.j.ok === true && key(r) === "external_nudge_sent", `${r.status} ${key(r)}`);
  r = await act({ action: "transmit_offer", negotiation_id: A1.neg, thread_id: A1.thread, follow_up: true });
  check("V8 deuxième relance immédiate refusée", r.j.ok === false && key(r) === "nudge_too_soon", key(r));
  r = await act({ action: "ask", article_id: A2.article, thread_id: A2.thread, text: "test" });
  check("V9 veille : dès qu'une voie s'ouvre (C1 + contact public), « Envoyer mon offre » réapparaît", ids(r).includes("envoyer-offre"), ids(r).join(","));
  r = await act({ action: "transmit_offer", negotiation_id: A2.neg, thread_id: A2.thread });
  check("V10 l'offre gardée en veille part au tap une fois la voie ouverte", r.j.ok === true && key(r) === "external_offer_sent" && !!r.j.avatar?.synthesis, `${r.status} ${key(r)}`);
}
console.log(`\n${results.filter(Boolean).length}/${results.length} PASS`);
process.exit(results.every(Boolean) ? 0 : 1);
