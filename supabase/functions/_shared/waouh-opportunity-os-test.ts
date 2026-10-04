import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { contactabilityFromBasis } from "./waouh-signal-fabric.ts";
import {
  buildContactPack,
  computeActionability,
  deriveNextBestAction,
  mandateAllowsContact,
  rankChannels,
  remainingContactCapacity,
  boundedFollowUpDecision,
  parseChatMandateDirective,
  serviceMayActForOwner,
} from "./waouh-opportunity-os.ts";

Deno.test("Opportunity OS: WAOUH interne ouvre directement Deal Room", () => {
  const pack = buildContactPack({
    fabricId: "article:1",
    sourceKey: "waouh_app",
    contactability: "C2",
    trustScore: 90,
    entityResolved: true,
    internalArticle: true,
    channels: [{ channel: "waouh", verified: true, reachable: true }],
  });
  assertEquals(pack.readiness_level, "R4");
  assertEquals(pack.next_best_action, "OPEN_DEAL_ROOM");
  assertEquals(pack.best_channel, "waouh");
});

Deno.test("Opportunity OS: C1 business public devient immédiatement exploitable", () => {
  const pack = buildContactPack({
    fabricId: "external:abc",
    sourceKey: "google_places",
    contactability: "C1",
    trustScore: 88,
    observedAt: new Date().toISOString(),
    entityResolved: true,
    channels: [{
      channel: "whatsapp",
      verified: true,
      reachable: true,
      public_business: true,
      consent_state: "public_business",
      last4: "1234",
    }],
  });
  assertEquals(pack.readiness_level, "R4");
  assertEquals(pack.next_best_action, "CONTACT_NOW");
  assert(pack.actionability_score >= 70);
});

Deno.test("Opportunity OS: C0 sans canal reste ENRICH", () => {
  const pack = buildContactPack({
    fabricId: "external:def",
    contactability: "C0",
    trustScore: 60,
    entityResolved: true,
    channels: [],
  });
  assertEquals(pack.next_best_action, "ENRICH");
  assertEquals(pack.readiness_level, "R2");
});

Deno.test("Opportunity OS: classement privilégie WAOUH puis WhatsApp", () => {
  const ranked = rankChannels([
    { channel: "email", verified: true },
    { channel: "whatsapp", verified: true, reachable: true },
    { channel: "waouh", verified: true, reachable: true },
  ]);
  assertEquals(ranked[0].channel, "waouh");
  assertEquals(ranked[1].channel, "whatsapp");
});

Deno.test("Opportunity OS: mandat semi-autonome autorise WhatsApp actionnable", () => {
  const pack = buildContactPack({
    fabricId: "external:x",
    contactability: "C4",
    trustScore: 90,
    entityResolved: true,
    channels: [{ channel: "whatsapp", verified: true, reachable: true }],
  });
  const result = mandateAllowsContact({
    autonomy_mode: "semi_autonomous",
    min_actionability_score: 60,
    allow_whatsapp: true,
  }, pack);
  assertEquals(result.allowed, true);
});

Deno.test("Opportunity OS: assisted n'envoie jamais seul", () => {
  const pack = buildContactPack({
    fabricId: "external:x",
    contactability: "C4",
    trustScore: 90,
    entityResolved: true,
    channels: [{ channel: "whatsapp", verified: true, reachable: true }],
  });
  assertEquals(mandateAllowsContact({ autonomy_mode: "assisted" }, pack).allowed, false);
});


Deno.test("Opportunity OS: le plafond de contacts est cumulatif", () => {
  assertEquals(remainingContactCapacity(5, 0), 5);
  assertEquals(remainingContactCapacity(5, 3), 2);
  assertEquals(remainingContactCapacity(5, 5), 0);
  assertEquals(remainingContactCapacity(5, 9), 0);
});

Deno.test("Opportunity OS: relance bornée à 24 h et max_followups", () => {
  const now = Date.parse("2026-10-04T22:00:00Z");
  const old = "2026-10-03T20:00:00Z";
  const recent = "2026-10-04T12:00:00Z";
  assertEquals(boundedFollowUpDecision({
    autonomyMode: "semi_autonomous", stage: "waiting_reply",
    lastActivityAt: old, maxFollowups: 1, followupsSent: 0, nowMs: now,
  }).due, true);
  assertEquals(boundedFollowUpDecision({
    autonomyMode: "semi_autonomous", stage: "waiting_reply",
    lastActivityAt: recent, maxFollowups: 1, followupsSent: 0, nowMs: now,
  }).reason, "too_early");
  assertEquals(boundedFollowUpDecision({
    autonomyMode: "semi_autonomous", stage: "waiting_reply",
    lastActivityAt: old, maxFollowups: 1, followupsSent: 1, nowMs: now,
  }).reason, "followup_limit_reached");
  assertEquals(boundedFollowUpDecision({
    autonomyMode: "assisted", stage: "waiting_reply",
    lastActivityAt: old, maxFollowups: 2, followupsSent: 0, nowMs: now,
  }).reason, "assisted");
});


Deno.test("Signal Fabric: un connecteur C1 ne crée jamais de consentement implicite", () => {
  assertEquals(contactabilityFromBasis("C1", "unknown", false), "C0");
  assertEquals(contactabilityFromBasis("C4", "unknown", false), "C0");
  assertEquals(contactabilityFromBasis("C2", "unknown", false), "C2");
  assertEquals(contactabilityFromBasis("C1", "public_business", true), "C1");
  assertEquals(contactabilityFromBasis("C0", "initiated", false), "C2");
  assertEquals(contactabilityFromBasis("C0", "opt_in", false), "C3");
  assertEquals(contactabilityFromBasis("C0", "partner_contract", false), "C4");
});


Deno.test("Opportunity OS Chat: une recherche simple ne crée jamais de mandat", () => {
  assertEquals(parseChatMandateDirective(
    "Je cherche un iPhone 13 moins de 250000 à Cotonou",
    "BUY",
  ), null);
});

Deno.test("Opportunity OS Chat: délégation explicite semi-autonome bornée", () => {
  const directive = parseChatMandateDirective(
    "Bot trouve-moi un iPhone 13 et contacte jusqu'à 5 vendeurs pour moi",
    "BUY",
  );
  assertEquals(directive?.autonomyMode, "semi_autonomous");
  assertEquals(directive?.maxContacts, 5);
  assertEquals(directive?.maxFollowups, 1);
  assertEquals(directive?.durationHours, 24);
});

Deno.test("Opportunity OS Chat: autonomie explicite et limites plafonnées", () => {
  const directive = parseChatMandateDirective(
    "Avatar contacte automatiquement jusqu'à 99 acheteurs et relance 9 fois pendant 40 jours",
    "SELL",
  );
  assertEquals(directive?.autonomyMode, "autonomous");
  assertEquals(directive?.maxContacts, 20);
  assertEquals(directive?.maxFollowups, 5);
  assertEquals(directive?.durationHours, 720);
});

Deno.test("Opportunity OS Chat: validation de chaque contact reste assistée", () => {
  const directive = parseChatMandateDirective(
    "Bot contacte 3 vendeurs mais demande-moi avant de contacter",
    "BUY",
  );
  assertEquals(directive?.autonomyMode, "assisted");
  assertEquals(directive?.maxFollowups, 0);
});


Deno.test("Opportunity OS: service-owner est limitée à la découverte et au mandat", () => {
  assertEquals(serviceMayActForOwner("nexus.global_discovery"), true);
  assertEquals(serviceMayActForOwner("nexus.mandate.create"), true);
  assertEquals(serviceMayActForOwner("nexus.contact.send"), false);
  assertEquals(serviceMayActForOwner("offer.respond"), false);
  assertEquals(serviceMayActForOwner("payment.create"), false);
});
