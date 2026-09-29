import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeLevel, resolveContactPath } from "./waouh-contact-path.ts";
import {
  externalFollowUpMessage, followUpDecision, nudgeAllowed, progressFor, progressLine, synthesizeOffer, watchDecision,
} from "./waouh-avatar-notes.ts";

const T0 = new Date("2026-09-29T08:00:00Z");
const after = (h: number) => new Date(T0.getTime() + h * 3600_000);

Deno.test("politique C0–C5 : aucun niveau n'est une impasse (toujours une voie : envoi au tap, relais ou veille)", () => {
  for (const level of ["C0", "C1", "C2", "C3", "C4", "C5", "zzz", null, undefined]) {
    for (const reachable of [true, false, null]) {
      const p = resolveContactPath({ level, reachable, signedIn: true, relayAvailable: false });
      assert(["send_on_tap", "approval_relay", "watch"].includes(p.mode), `${level}/${reachable}`);
      assertEquals(p.canSendNow, p.mode !== "watch");
      assert(p.label.length > 0 && !/contacter/i.test(p.label));
    }
  }
});

Deno.test("politique : le consentement n'est jamais contourné (C0 ne s'envoie jamais ; pas de contact joignable → veille)", () => {
  assertEquals(resolveContactPath({ level: "C0", reachable: true, signedIn: true }).mode, "watch");
  assertEquals(resolveContactPath({ level: "C0", reachable: true, signedIn: true }).watchReason, "channel_unknown");
  for (const level of ["C1", "C3", "C4"]) assertEquals(resolveContactPath({ level, reachable: false, signedIn: true }).mode, "watch", level);
  assertEquals(resolveContactPath({ level: "C1", reachable: null, signedIn: true }).mode, "watch");
});

Deno.test("politique : C1 public au tap, C2 relais validé, C3/C4 contact vérifié/établi, C5 interne", () => {
  assertEquals(resolveContactPath({ level: "C1", reachable: true, signedIn: true }).mode, "send_on_tap");
  assertEquals(resolveContactPath({ level: "C2", reachable: false, signedIn: true, relayAvailable: true }).mode, "approval_relay");
  assertEquals(resolveContactPath({ level: "C3", reachable: true, signedIn: true }).mode, "send_on_tap");
  assertEquals(resolveContactPath({ level: "C4", reachable: true, signedIn: true }).etaHours, 6);
  const c5 = resolveContactPath({ level: "C5", reachable: null, signedIn: true });
  assertEquals([c5.mode, c5.canSendNow], ["send_on_tap", true]);
});

Deno.test("politique : invité sans jeton → jamais d'envoi, raison explicite", () => {
  const p = resolveContactPath({ level: "C4", reachable: true, signedIn: false });
  assertEquals([p.mode, p.watchReason], ["watch", "sign_in_required"]);
  assertEquals(normalizeLevel("c3"), "C3");
  assertEquals(normalizeLevel("bof"), "C0");
});

Deno.test("points d'avancement : offre prête → étape courante « Offre transmise » ; après envoi → suivi actif", () => {
  const ready = progressFor({ hasOffer: true, transmitted: false, watching: false, replied: false });
  assertEquals(ready.map((s) => s.state), ["done", "done", "done", "current", "todo", "todo"]);
  assertEquals(progressLine(ready), "Étape 4/6 · Offre transmise");
  const sent = progressFor({ hasOffer: true, transmitted: true, watching: false, replied: false });
  assertEquals(sent.map((s) => s.state), ["done", "done", "done", "done", "done", "current"]);
  assertEquals(progressLine(sent), "Étape 6/6 · Réponse du vendeur");
  const watching = progressFor({ hasOffer: true, transmitted: false, watching: true, replied: false });
  assert(watching[3].label.startsWith("En veille"));
  assert(progressFor({ hasOffer: true, transmitted: true, watching: false, replied: true }).every((s) => s.state === "done"));
});

Deno.test("synthèse : écart au prix affiché, posture, prix conseillé si offre très ambitieuse, suivi à 24 h", () => {
  const close = synthesizeOffer({ offer: 145000, listPrice: 150000, path: { level: "C1", etaHours: 24 }, now: T0 });
  assertEquals([close.gapPct, close.stance, close.suggested], [-3, "close", null]);
  const fair = synthesizeOffer({ offer: 130000, listPrice: 150000, path: { level: "C1", etaHours: 24 }, now: T0 });
  assertEquals([fair.gapPct, fair.stance], [-13, "fair"]);
  const amb = synthesizeOffer({ offer: 90000, listPrice: 150000, path: { level: "C3", etaHours: 12 }, now: T0 });
  assertEquals([amb.gapPct, amb.stance, amb.suggested], [-40, "ambitious", 127500]);
  assertEquals(amb.nextFollowUpAt, after(24).toISOString());
  assertEquals(synthesizeOffer({ offer: null, listPrice: 150000, path: { level: "C1", etaHours: null }, now: T0 }).stance, "unknown");
});

Deno.test("suivi : attente < 24 h, rappels à 24 h et 72 h, clôture proposée à 7 jours, rien après réponse", () => {
  const d = (h: number, nudgesNoted: number, extra: Record<string, unknown> = {}) =>
    followUpDecision({ transmittedAt: T0, now: after(h), nudgesNoted, replied: false, ...extra });
  assertEquals(d(2, 0).action, "wait");
  assertEquals(d(2, 0).dueAt, after(24).toISOString());
  assertEquals([d(25, 0).action, d(25, 0).nudgeNo], ["nudge", 1]);
  assertEquals(d(30, 1).action, "wait");
  assertEquals([d(80, 1).action, d(80, 1).nudgeNo], ["nudge", 2]);
  assertEquals(d(100, 2).action, "wait");
  assertEquals(d(170, 2).action, "expire");
  assertEquals(d(400, 2, { expiredNoted: true }).action, "wait");
  assertEquals(followUpDecision({ transmittedAt: T0, now: after(500), nudgesNoted: 0, replied: true }).action, "none");
});

Deno.test("relance manuelle : au plus une par 24 h", () => {
  assertEquals(nudgeAllowed({ lastSentAt: T0, now: after(23) }), false);
  assertEquals(nudgeAllowed({ lastSentAt: T0, now: after(24) }), true);
});

Deno.test("veille : prévient UNE fois quand une voie s'ouvre, sinon attend, clôt après 14 jours", () => {
  assertEquals(watchDecision({ watchingSince: T0, now: after(5), canSendNow: false, reachableNoted: false }).action, "wait");
  assertEquals(watchDecision({ watchingSince: T0, now: after(5), canSendNow: true, reachableNoted: false }).action, "notify_reachable");
  assertEquals(watchDecision({ watchingSince: T0, now: after(6), canSendNow: true, reachableNoted: true }).action, "wait");
  assertEquals(watchDecision({ watchingSince: T0, now: after(15 * 24), canSendNow: false, reachableNoted: false }).action, "expire");
});

Deno.test("message de relance : courtois, sans coordonnées, borné", () => {
  const m = externalFollowUpMessage("Samsung *A54*", 130000);
  assert(m.includes("« Samsung A54 »") && /130[\s  ]000 FCFA/.test(m), m);
  assert(externalFollowUpMessage("x".repeat(500), 1).length <= 1000);
});

import { AVATAR_INTENTS, externalTimeline } from "./waouh-avatar-notes.ts";
import { nextActions, withExternalOutcome, type DealState } from "./waouh-commerce-contract.ts";

Deno.test("chronologie : envoi, relances, veille et notes reconstruits depuis les messages", () => {
  const iso = (h: number) => after(h).toISOString();
  const t = externalTimeline([
    { at: iso(30), intent: AVATAR_INTENTS.nudgeSent },
    { at: iso(1), intent: AVATAR_INTENTS.sent },
    { at: iso(26), intent: AVATAR_INTENTS.nudgeDue },
    { at: iso(0), intent: AVATAR_INTENTS.watching },
    { at: iso(0.5), intent: "autre" },
  ]);
  assertEquals(t.transmittedAt?.toISOString(), iso(1));
  assertEquals(t.lastSentAt?.toISOString(), iso(30));
  assertEquals([t.nudgesSent, t.nudgesNoted], [1, 1]);
  assertEquals(t.watchingSince?.toISOString(), iso(0));
  const empty = externalTimeline([]);
  assertEquals([empty.transmittedAt, empty.nudgesSent, empty.reachableNoted], [null, 0, false]);
});

Deno.test("chronologie : une nouvelle veille remet à zéro « joignable déjà notifié »", () => {
  const t = externalTimeline([
    { at: after(1).toISOString(), intent: AVATAR_INTENTS.watching },
    { at: after(2).toISOString(), intent: AVATAR_INTENTS.reachable },
    { at: after(3).toISOString(), intent: AVATAR_INTENTS.watching },
  ]);
  assertEquals(t.reachableNoted, false);
});

const ext: DealState = {
  articleId: "a1", articlePrice: 150000, negotiationId: "n1", negotiationState: "proposed", lastActor: "buyer", lastOfferPrice: 130000,
  dealId: null, dealStatus: null, sellerConfirmed: false, paymentSelected: false, paymentMethod: null, externalSeller: true,
};

Deno.test("boutons externes : jamais d'impasse — envoi, veille, relance selon l'état", () => {
  const ids = (s: DealState) => nextActions(s, "buyer").map((a) => a.id.split(":")[0]);
  assertEquals(ids({ ...ext, externalMode: "send_on_tap" }), ["envoyer-offre", "proposer-prix"]);
  assertEquals(ids({ ...ext, externalMode: "approval_relay" }), ["envoyer-offre", "proposer-prix"]);
  assertEquals(ids({ ...ext, externalMode: "watch" }), ["veille", "proposer-prix"]);
  assertEquals(ids({ ...ext, externalMode: "watch", externalWatching: true }), ["proposer-prix"]);
  assertEquals(ids({ ...ext, externalMode: "send_on_tap", externalTransmitted: true }), ["proposer-prix"]);
  assertEquals(ids({ ...ext, externalMode: "send_on_tap", externalTransmitted: true, externalNudgeDue: true }), ["relancer", "proposer-prix"]);
  for (const mode of ["send_on_tap", "approval_relay", "watch"] as const) {
    assert(ids({ ...ext, externalMode: mode }).length >= 1, mode);
  }
});

Deno.test("état après action : l'envoi ou la veille vient d'avoir lieu → boutons cohérents dès la réponse", () => {
  const sent = withExternalOutcome({ ...ext, externalMode: "send_on_tap" }, "external_offer_sent");
  assertEquals([sent.externalTransmitted, sent.externalNudgeDue], [true, false]);
  const watching = withExternalOutcome({ ...ext, externalMode: "send_on_tap" }, "avatar_watching");
  assertEquals([watching.externalWatching, watching.externalMode], [true, "watch"]);
  const nudged = withExternalOutcome({ ...ext, externalTransmitted: true, externalNudgeDue: true }, "external_nudge_sent");
  assertEquals(nudged.externalNudgeDue, false);
  const same = withExternalOutcome(ext, "deal_opened");
  assertEquals(same, ext);
});
