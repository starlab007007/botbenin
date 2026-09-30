import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  activityDigest, briefingText, composeBriefing, DEFAULT_PREFS, emptyActivity, HELP_TIPS, inQuietHours, mergePrefs, nextBriefingAt,
  normalizePrefs, shouldBrief, type Activity, type AvatarPrefs, type BriefingKind,
} from "./waouh-avatar-briefing.ts";

// 29/09/2026 : les heures ci-dessous sont en UTC ; le Bénin est en UTC+1.
const at = (utcHour: number, day = 29) => new Date(Date.UTC(2026, 8, day, utcHour, 0, 0));
const T = (h: number) => (n: number) => new Date(at(h).getTime() - n * 3600_000);
const ref = (id: string) => ({ threadId: `t-${id}`, articleId: `a-${id}`, negotiationId: `n-${id}` });

Deno.test("préférences : valeurs inconnues ou invalides → défauts, valeurs valides conservées", () => {
  assertEquals(normalizePrefs(null), DEFAULT_PREFS);
  assertEquals(normalizePrefs({ cadence: "toutes-les-minutes", welcome: "oui", quiet_start: 99 }), DEFAULT_PREFS);
  assertEquals(normalizePrefs({ cadence: "weekly", welcome: false, quiet_start: 22, quiet_end: 6 }), { welcome: false, cadence: "weekly", quietStart: 22, quietEnd: 6, notifyEvents: true, notifyDigest: false });
});

Deno.test("heures calmes : 21 h → 7 h heure du Bénin, à cheval sur minuit ; début = fin → jamais", () => {
  const p = { quietStart: 21, quietEnd: 7 };
  assertEquals(inQuietHours(at(20), p), true);  // 21 h locale
  assertEquals(inQuietHours(at(19), p), false); // 20 h locale
  assertEquals(inQuietHours(at(3), p), true);   // 4 h locale
  assertEquals(inQuietHours(at(6), p), false);  // 7 h locale
  assertEquals(inQuietHours(at(23), { quietStart: 5, quietEnd: 5 }), false);
  assertEquals(inQuietHours(at(10), { quietStart: 9, quietEnd: 12 }), true); // plage sans minuit : 11 h locale
});

const base = { digestChanged: true, hasActionable: false };
Deno.test("ouverture : premier accueil, bienvenue après 6 h, point si récent, silence si < 30 min ou accueil coupé", () => {
  const prefs = DEFAULT_PREFS;
  const now = at(10);
  assertEquals(shouldBrief({ prefs, lastBriefingAt: null, now, trigger: "open", ...base }).kind, "first");
  assertEquals(shouldBrief({ prefs, lastBriefingAt: T(10)(8), now, trigger: "open", ...base }).kind, "welcome");
  assertEquals(shouldBrief({ prefs, lastBriefingAt: T(10)(2), now, trigger: "open", ...base }).kind, "point");
  assertEquals(shouldBrief({ prefs, lastBriefingAt: new Date(now.getTime() - 10 * 60_000), now, trigger: "open", ...base }).reason, "too_soon");
  assertEquals(shouldBrief({ prefs: { ...prefs, welcome: false }, lastBriefingAt: null, now, trigger: "open", ...base }).reason, "welcome_off");
});

Deno.test("manuel : toujours envoyé, même accueil coupé, cadence coupée et < 30 min", () => {
  const prefs: AvatarPrefs = { ...DEFAULT_PREFS, welcome: false, cadence: "off" };
  const d = shouldBrief({ prefs, lastBriefingAt: new Date(at(10).getTime() - 60_000), now: at(10), trigger: "manual", ...base });
  assertEquals([d.send, d.kind], [true, "point"]);
});

Deno.test("point régulier : échéance, heures calmes, rien de nouveau, cadence coupée", () => {
  const prefs: AvatarPrefs = { ...DEFAULT_PREFS, cadence: "every_4h" };
  const now = at(10);
  assertEquals(shouldBrief({ prefs, lastBriefingAt: T(10)(5), now, trigger: "tick", ...base }).kind, "digest");
  assertEquals(shouldBrief({ prefs, lastBriefingAt: T(10)(3), now, trigger: "tick", ...base }).reason, "not_due");
  assertEquals(shouldBrief({ prefs, lastBriefingAt: T(3)(5), now: at(3), trigger: "tick", ...base }).reason, "quiet_hours");
  assertEquals(shouldBrief({ prefs, lastBriefingAt: T(10)(5), now, trigger: "tick", digestChanged: false, hasActionable: false }).reason, "nothing_new");
  assertEquals(shouldBrief({ prefs, lastBriefingAt: T(10)(5), now, trigger: "tick", digestChanged: false, hasActionable: true }).send, true);
  assertEquals(shouldBrief({ prefs: { ...prefs, cadence: "off" }, lastBriefingAt: null, now, trigger: "tick", ...base }).reason, "cadence_off");
});

Deno.test("prochain point : décalé hors des heures calmes, null si cadence coupée", () => {
  const prefs: AvatarPrefs = { ...DEFAULT_PREFS, cadence: "daily" };
  const next = nextBriefingAt(prefs, T(19)(1), at(19))!; // dernier point 18 h UTC → +24 h = 18 h UTC demain = 19 h locale
  assertEquals(inQuietHours(next, prefs), false);
  const late = nextBriefingAt({ ...prefs, cadence: "hourly" }, at(19), at(19))!; // 20 h UTC = 21 h locale → repoussé à 7 h locale
  assertEquals(inQuietHours(late, prefs), false);
  assert(late.getTime() > at(19).getTime());
  assertEquals(nextBriefingAt({ ...prefs, cadence: "off" }, null, at(10)), null);
});

const busy = (): Activity => ({
  displayName: "Zime Songbian",
  offersToAnswer: [{ ...ref("1"), title: "Vélo tout terrain" }],
  waitingOnSeller: [{ ...ref("2"), title: "Casque audio", hours: 5 }],
  transmitted: [{ ...ref("3"), title: "Samsung Galaxy A54 5G 256 Go noir très bon état", hours: 26, nudgeDue: true }, { ...ref("4"), title: "iPhone 12", hours: 3, nudgeDue: false }],
  watching: [{ ...ref("5"), title: "Pixel 7", reachable: true }, { ...ref("6"), title: "Tecno Spark", reachable: false }],
  dealsInProgress: [{ ...ref("7"), title: "Frigo", role: "buyer", status: "assigned" }],
  completedRecent: 2,
});

Deno.test("composition : 3 phrases courtes maximum, sans montant ni coordonnée, pour chaque type de point", () => {
  for (const kind of ["first", "welcome", "point", "digest"] as BriefingKind[]) {
    for (const activity of [busy(), emptyActivity("Zime"), emptyActivity(null)]) {
      const b = composeBriefing({ activity, kind, now: at(10) });
      assert(b.sentences.length >= 2 && b.sentences.length <= 3, `${kind}: ${b.sentences.length}`);
      for (const s of b.sentences) assert(s.length > 3 && s.length <= 160, `${kind}: (${s.length}) ${s}`);
      assert(!/FCFA|\d{6,}|@|\+229/.test(briefingText(b)), briefingText(b));
      assert(b.actions.length >= 1 && b.actions.length <= 3);
      assert(b.sections.length >= 1);
      for (const section of b.sections) assert(section.items.length >= 1 && section.items.length <= 3);
    }
  }
});

Deno.test("composition : accueil selon l'heure (Bonsoir/Bonjour), prénom sans e-mail ni chiffres, premier accueil = présentation", () => {
  assert(composeBriefing({ activity: busy(), kind: "welcome", now: at(10) }).greeting.startsWith("Bonjour Zime,"));
  assert(composeBriefing({ activity: busy(), kind: "welcome", now: at(19) }).greeting.startsWith("Bonsoir Zime,"));
  assert(composeBriefing({ activity: emptyActivity("zime@exemple.bj"), kind: "welcome", now: at(10) }).greeting.startsWith("Bonjour,"));
  assert(composeBriefing({ activity: emptyActivity("0197001122"), kind: "welcome", now: at(10) }).greeting.startsWith("Bonjour,"));
  const first = composeBriefing({ activity: emptyActivity("Zime"), kind: "first", now: at(10) });
  assert(first.greeting.includes("je suis votre avatar") && first.sentences[2].includes("Je cherche"), first.sentences.join(" | "));
});

Deno.test("composition : le point priorise (offres à traiter, relances, voies ouvertes) et propose la prochaine étape", () => {
  const b = composeBriefing({ activity: busy(), kind: "point", now: at(10) });
  assert(b.sentences[1].startsWith("1 offre à traiter, 1 offre sans réponse depuis plus de 24 h, 1 vendeur devenu joignable"), b.sentences[1]);
  assert(b.sentences[2].startsWith("Prochaine étape : relancer le vendeur de « Samsung Galaxy A54"), b.sentences[2]);
  assertEquals(b.actions.map((a) => a.id.split(":")[0]), ["relancer", "envoyer-offre", "ouvrir-deal"]);
  assertEquals(b.actions[0].thread_id, "t-3");
  assertEquals(b.hasActionable, true);
  assertEquals(b.sections.map((s) => s.key), ["activities", "watch", "contacts", "next"]);
});

Deno.test("composition : rien en cours → astuce d'aide du jour et boutons d'amorçage ; l'astuce tourne d'un jour à l'autre", () => {
  const idle = composeBriefing({ activity: emptyActivity("Zime"), kind: "point", now: at(10) });
  assertEquals(idle.sentences[1], "Rien en cours pour l'instant.");
  assert((HELP_TIPS as readonly string[]).includes(idle.sentences[2]));
  assertEquals(idle.actions.map((a) => a.id), ["aide:acheter", "aide:vendre", "avatar:reglages"]);
  assertEquals(idle.hasActionable, false);
  const tips = new Set([28, 29, 30, 1, 2, 3].map((d, i) => composeBriefing({ activity: emptyActivity(), kind: "point", now: new Date(Date.UTC(2026, 8 + (i > 2 ? 1 : 0), d, 10)) }).tip));
  assert(tips.size >= 5, `astuces distinctes : ${tips.size}`);
});

Deno.test("composition : commande en cours et veille seules → phrases de suivi adaptées", () => {
  const a = emptyActivity("Zime");
  a.dealsInProgress.push({ ...ref("9"), title: "Frigo", role: "buyer", status: "assigned" });
  assert(composeBriefing({ activity: a, kind: "point", now: at(10) }).sentences[2].startsWith("Je suis « Frigo »"));
  const w = emptyActivity("Zime");
  w.watching.push({ ...ref("8"), title: "Pixel", reachable: false });
  const bw = composeBriefing({ activity: w, kind: "point", now: at(10) });
  assert(bw.sentences[2].includes("Je surveille les voies de contact"));
  assertEquals(bw.hasActionable, false);
});

Deno.test("empreinte : identique si rien ne change, différente dès qu'une relance devient due ou qu'une voie s'ouvre", () => {
  const a = busy();
  assertEquals(activityDigest(a), activityDigest(busy()));
  const b = busy(); b.transmitted[1].nudgeDue = true;
  assert(activityDigest(a) !== activityDigest(b));
  const c = busy(); c.watching[1].reachable = true;
  assert(activityDigest(a) !== activityDigest(c));
});

Deno.test("mise à jour des réglages : seuls les champs valides remplacent l'existant", () => {
  const current: AvatarPrefs = { welcome: false, cadence: "every_4h", quietStart: 22, quietEnd: 6, notifyEvents: true, notifyDigest: false };
  assertEquals(mergePrefs(current, { cadence: "toutes-les-secondes", quiet_start: 99, welcome: "oui", quiet_end: -1 }), current);
  assertEquals(mergePrefs(current, { quiet_start: 23.5, quiet_end: "6" }), current);
  assertEquals(mergePrefs(current, null), current);
  assertEquals(mergePrefs(current, { cadence: "weekly" }), { ...current, cadence: "weekly" });
  assertEquals(mergePrefs(current, { welcome: true, quiet_start: 0, quiet_end: 23 }), { ...current, welcome: true, quietStart: 0, quietEnd: 23 });
  assertEquals(mergePrefs(current, { cadence: "off", last_briefing_at: "2000-01-01", auth_user_id: "x" }), { ...current, cadence: "off" });
});

import { composeBubbles } from "./waouh-avatar-briefing.ts";
Deno.test("composeBubbles : une phrase par bulle, boutons sur la dernière ; sans nouveauté : une bulle", () => {
  const b = composeBriefing({ activity: emptyActivity("Zime"), kind: "welcome", now: new Date(Date.UTC(2026, 8, 29, 10)) });
  const bubbles = composeBubbles(b);
  assertEquals(bubbles.length, b.sentences.length);
  assertEquals(bubbles.slice(0, -1).every((x) => x.actions.length === 0), true);
  assertEquals(bubbles[bubbles.length - 1].actions.length > 0, true);
  const short = composeBubbles(b, { unchanged: true });
  assertEquals(short.length, 1);
  // Le tout premier accueil n'est jamais raccourci.
  const first = composeBriefing({ activity: emptyActivity("Zime"), kind: "first", now: new Date(Date.UTC(2026, 8, 29, 10)) });
  assertEquals(composeBubbles(first, { unchanged: true }).length, first.sentences.length);
});
