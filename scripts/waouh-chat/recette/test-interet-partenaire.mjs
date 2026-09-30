// Test ciblé « intérêt sur un produit de catalogue partenaire » (retour d'essai du 30/09) :
//   1) l'acheteur ne reçoit qu'UNE confirmation même si l'application envoie 3 intérêts simultanés (cas du bug) ;
//   2) le vendeur (compte propriétaire du partenaire) reçoit UNE notification « Nouvel acheteur » avec Accepter / Contre-offre / Refuser ;
//   3) la discussion continue : le vendeur contre-propose, l'acheteur reçoit ; 4) l'acheteur retire son offre (nettoyage) ;
//   5) un acheteur qui est le propriétaire du partenaire (article « ziazi ») est refusé (self).
// Données réelles mais marquées : négociations de test sur les articles « zaka » / « Gourde », fermées à la fin.
// Variables : X_EMAIL, X_PW (acheteur), Y_EMAIL, Y_PW (vendeur) ; facultatif ARTICLE=zaka|Gourde, SELF_ARTICLE=ziazi.
import { readFileSync } from "node:fs";
const env = process.env;
const client = readFileSync(new URL("../../../src/integrations/supabase/client.ts", import.meta.url), "utf8");
const SB_URL = env.SB_URL || client.match(/SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
const SB_ANON = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/)?.[1];
if (!["mvynepqulhflxtyymtzs", "ljzwqyzaovnandpyfpgc"].some((r) => SB_URL?.includes(r))) { console.error("Refus : projet non autorisé."); process.exit(2); }
for (const k of ["X_EMAIL", "X_PW", "Y_EMAIL", "Y_PW"]) if (!env[k]) { console.error(`Variable manquante : ${k}`); process.exit(2); }
const run = Date.now().toString(36);
let fails = 0;
const check = (ok, id, detail = "") => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? " — " + detail : ""}`); };
const login = async (email, password) => {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SB_ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json(); if (!j.access_token) throw new Error(`connexion refusée pour ${email}`); return { t: j.access_token, uid: j.user.id };
};
const call = async (fn, who, body) => {
  const r = await fetch(`${SB_URL}/functions/v1/${fn}`, { method: "POST", headers: { apikey: SB_ANON, Authorization: `Bearer ${who.t}`, "Content-Type": "application/json", "x-waouh-session": who.sid }, body: JSON.stringify({ ...body, session_id: who.sid }) });
  let j; try { j = await r.json(); } catch { j = {}; } return { status: r.status, j };
};
const rest = async (who, path) => { const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_ANON, Authorization: `Bearer ${who.t}`, "x-waouh-session": who.sid } }); return r.ok ? r.json() : []; };
const X = { sid: `tipX-${run}`, ...(await login(env.X_EMAIL, env.X_PW)) };
const Y = { sid: `tipY-${run}`, ...(await login(env.Y_EMAIL, env.Y_PW)) };
const titleOf = env.ARTICLE || "zaka";
const digits = (s) => String(s ?? "").replace(/\D/g, "");
const findArticle = async (title) => (await rest(X, `waouh_articles?title=eq.${encodeURIComponent(title)}&status=eq.active&select=id,title,price,seller_id,partner_id&limit=1`))[0];
const hist = async (who, thread, article, role) => {
  const r = await call("waouh-match-history", who, { thread_id: thread, article_id: article, auth_user_id: who.uid, role, limit: 120 });
  return (r.j.messages || r.j.items || []).map((m) => ({ text: m.text ?? "", dir: m.direction, actions: (m.meta?.actions ?? m.actions ?? []).map((a) => String(a.id ?? a).split(":")[0]) }));
};

const art = await findArticle(titleOf);
check(!!art, `l'article « ${titleOf} » existe et est actif`, art ? `id=${art.id}, vendeur=${art.seller_id}` : "introuvable");
if (!art) process.exit(1);

// 1) Trois intérêts simultanés, comme l'ancien comportement du Web (évènement doublé + tampon).
const trio = await Promise.all([1, 2, 3].map(() => call("waouh-buyer-interest", X, { article_id: art.id, source: "product_card_interest" })));
const ok = trio.filter((r) => r.j.ok);
const thread = ok.find((r) => r.j.thread_id)?.j.thread_id, neg = ok.find((r) => r.j.negotiation_id)?.j.negotiation_id;
check(ok.length === 3 && !!thread && !!neg, "les 3 appels simultanés aboutissent au même fil et à la même négociation", `http=${trio.map((r) => r.status)}, fils=${new Set(ok.map((r) => r.j.thread_id)).size}, négociations=${new Set(ok.map((r) => r.j.negotiation_id)).size}`);
check(ok.filter((r) => r.j.created).length <= 1, "une seule création de négociation", `créées=${ok.filter((r) => r.j.created).length}`);
await new Promise((r) => setTimeout(r, 4000));

// 2) Côté acheteur : une seule confirmation « Offre envoyée ».
const hx = await hist(X, thread, art.id, "buyer");
const conf = hx.filter((m) => /Offre envoy/i.test(m.text)).length;
check(conf === 1, "acheteur : une seule confirmation « Offre envoyée »", `${conf} confirmation(s)`);

// 3) Côté vendeur : une seule notification « Nouvel acheteur » avec les trois boutons.
const hy = await hist(Y, thread, art.id, "seller");
const nb = hy.filter((m) => /Nouvel acheteur/i.test(m.text));
const buttons = new Set(nb.flatMap((m) => m.actions));
check(nb.length === 1, "vendeur : une seule notification « Nouvel acheteur »", `${nb.length} notification(s)`);
check(["accepter", "refuser"].every((k) => buttons.has(k)) && [...buttons].some((k) => /contre/.test(k)), "vendeur : boutons Accepter / Contre-offre / Refuser", `boutons=${JSON.stringify([...buttons])}`);
const notifs = await rest(Y, `waouh_notifications?thread_id=eq.${thread}&select=id,notification_type,user_id`);
console.log(`   (notifications lisibles par le vendeur dans l'application : ${notifs.length}, types=${JSON.stringify([...new Set(notifs.map((n) => n.notification_type))])})`);

// 4) La discussion continue : contre-offre du vendeur → reçue par l'acheteur.
const counter = Math.max(100, Math.round(Number(art.price || 1000) * 0.9));
const c = await call("waouh-commerce-action", Y, { action: "offer", idem: `tip-${run}-c`, thread_id: thread, negotiation_id: neg, article_id: art.id, amount: counter, confirmed: true });
check(c.status === 200 && c.j.ok, `vendeur : contre-offre de ${counter} FCFA envoyée`, `http ${c.status}, ${c.j.reply?.key ?? c.j.code ?? ""}`);
const hx2 = await hist(X, thread, art.id, "buyer");
check(hx2.some((m) => digits(m.text).includes(String(counter))), "acheteur : reçoit la contre-offre", `« ${(hx2.at(-1)?.text || "").replace(/\s+/g, " ").slice(0, 70)} »`);

// Nettoyage : l'acheteur ferme la négociation de test.
const w = await call("waouh-commerce-action", X, { action: "reject", idem: `tip-${run}-w`, thread_id: thread, negotiation_id: neg });
console.log(`   (nettoyage : négociation de test fermée — http ${w.status}, ${w.j.reply?.key ?? w.j.code ?? ""})`);

// 5) Un acheteur qui est le propriétaire du partenaire ne peut pas s'offrir son produit.
const selfTitle = env.SELF_ARTICLE || "ziazi";
const selfArt = await findArticle(selfTitle);
if (!selfArt) console.log(`   (« ${selfTitle} » introuvable ou inactif : contrôle 5 ignoré)`);
else {
  const s = await call("waouh-buyer-interest", X, { article_id: selfArt.id, source: "product_card_interest" });
  check(s.j.ok === true && s.j.skipped === "self", `propriétaire : « ${selfTitle} » refusé (vous ne pouvez pas vous offrir votre propre produit)`, `http ${s.status}, ${JSON.stringify(s.j).slice(0, 120)}`);
  const s2 = await call("waouh-commerce-action", X, { action: "open_deal", idem: `tip-${run}-s`, article_id: selfArt.id });
  check(s2.j.ok === false && /self/.test(s2.j.reply?.key ?? s2.j.code ?? ""), "propriétaire (Deal Room v3) : refus self_article", `clé=${s2.j.reply?.key ?? s2.j.code}`);
}
console.log(`\n==== ${fails ? fails + " ÉCHEC(S)" : "TOUT EST CONFORME"} ====`);
process.exit(fails ? 1 : 0);
