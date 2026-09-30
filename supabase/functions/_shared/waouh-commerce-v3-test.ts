// Tests du Lot 2 : contrat d'action, texte libre strict, prédictif.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  actionEcho,
  type DealState,
  nextActions,
  turnFor,
  validateActionRequest,
} from "./waouh-commerce-contract.ts";
import {
  classifyDeterministic,
  classifyFreeText,
  resolveResultReference,
  sanitizeModelOutput,
} from "./waouh-free-text.ts";
import {
  acceptFirst,
  followUpPlan,
  medianResponseMinutes,
  preselectPayment,
  purchaseIntent,
  responseSamples,
  suggestPrice,
} from "./waouh-predictive.ts";
import { fcfa } from "./waouh-message-catalog.ts";
import { parseActionPayload } from "./waouh-commands.ts";

const ART = "3f2c1b0a-0000-4000-8000-00000000a001";
const NEG = "a1b2c3d4-0000-4000-8000-00000000abcd";
const DEAL = "0f9e8d7c-1111-4111-8111-111111111111";
const IDEM = "idem-0001-abcdef";

// --------------------------------------------------------------- contrat
Deno.test("contrat : actions valides et refus explicites", () => {
  assertEquals(validateActionRequest({ action: "open_deal", idem: IDEM, article_id: ART }).ok, true);
  const catalogOpen = validateActionRequest({
    action: "open_deal",
    idem: IDEM,
    catalog_id: ART,
    source_id: ART,
  });
  assertEquals(catalogOpen.ok, true);
  if (catalogOpen.ok) {
    assertEquals(catalogOpen.request.catalog_id, ART);
    assertEquals(catalogOpen.request.source_id, ART);
    assertEquals(catalogOpen.request.article_id, null);
  }
  assertEquals(validateActionRequest({ action: "offer", idem: IDEM, negotiation_id: NEG, amount: "2 300" }).ok, false);
  assertEquals(validateActionRequest({ action: "offer", idem: IDEM, negotiation_id: NEG, amount: 2300 }).ok, true);
  assertEquals(validateActionRequest({ action: "offer", idem: IDEM, negotiation_id: NEG, amount: 80 }).ok, true);
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ action: "hack", idem: IDEM }, "unknown_action"],
    [{ action: "open_deal", idem: "x" }, "idem_required"],
    [{ action: "open_deal", idem: IDEM }, "article_id_required"],
    [{ action: "open_deal", idem: IDEM, article_id: "pas-un-uuid" }, "invalid_article_id"],
    [{ action: "offer", idem: IDEM, negotiation_id: NEG }, "amount_required"],
    [{ action: "offer", idem: IDEM, negotiation_id: NEG, amount: 0 }, "invalid_amount"],
    [{ action: "pay_mode", idem: IDEM, deal_id: DEAL }, "method_required"],
    [{ action: "seller_confirm", idem: IDEM }, "deal_id_required"],
    [{ action: "ask", idem: IDEM, article_id: ART }, "text_required"],
  ];
  for (const [body, error] of cases) {
    const r = validateActionRequest(body);
    assertEquals(r.ok ? "ok" : r.error, error, JSON.stringify(body));
  }
});

const base: DealState = {
  articleId: ART, articlePrice: 2500, negotiationId: null, negotiationState: null, lastActor: null,
  lastOfferPrice: null, dealId: null, dealStatus: null, sellerConfirmed: false, paymentSelected: false, paymentMethod: null,
};

Deno.test("tour et boutons : l'acheteur ne décide jamais de sa propre offre", () => {
  const neg: DealState = { ...base, negotiationId: NEG, negotiationState: "proposed", lastActor: "buyer", lastOfferPrice: 2300 };
  assertEquals(turnFor(neg), "seller");
  // Pas son tour : jamais de fenêtre froide — l'acheteur peut modifier son offre ou poser une question.
  assertEquals(nextActions(neg, "buyer").map((a) => parseActionPayload(a.id)?.kind), ["offer_prompt", "ask", "reject"]); // « Retirer mon offre » : l'acheteur ne reste jamais sans issue
  assertEquals(nextActions(neg, "seller").map((a) => parseActionPayload(a.id)?.kind), ["accept", "counter", "reject"]);
  const countered: DealState = { ...neg, negotiationState: "countered", lastActor: "seller", lastOfferPrice: 2400 };
  assertEquals(turnFor(countered), "buyer");
  assertEquals(nextActions(countered, "buyer", { acceptFirst: false }).map((a) => parseActionPayload(a.id)?.kind), ["counter", "accept", "reject"]);
});

Deno.test("étapes suivantes : accord, livraison, fiche", () => {
  const agreement: DealState = { ...base, negotiationId: NEG, negotiationState: "accepted", dealId: DEAL, dealStatus: "awaiting_confirmation" };
  assertEquals(nextActions(agreement, "buyer").map((a) => parseActionPayload(a.id)?.kind), ["payment_preference_mobile", "payment_preference_cash", "cancel"]);
  assertEquals(nextActions(agreement, "seller").map((a) => parseActionPayload(a.id)?.kind), ["seller_confirm", "cancel"]);
  const paid: DealState = { ...agreement, paymentSelected: true };
  // Son action est faite : on attend le vendeur, avec de quoi le relancer ou annuler.
  assertEquals(nextActions(paid, "buyer").map((a) => parseActionPayload(a.id)?.kind), ["ask", "cancel"]);
  const delivered: DealState = { ...agreement, dealStatus: "delivered", paymentMethod: "mobile_money" };
  assertEquals(nextActions(delivered, "buyer").map((a) => parseActionPayload(a.id)?.kind), ["confirm_payment_mobile"]);
  assertEquals(nextActions(base, "buyer").map((a) => parseActionPayload(a.id)?.kind), ["open_deal", "offer_prompt", "ask"]);
  for (const s of [base, agreement, delivered]) for (const r of ["buyer", "seller"] as const) assert(nextActions(s, r).length <= 3);
});

Deno.test("écho de l'action (bulle de l'utilisateur)", () => {
  const echo = actionEcho({ action: "offer", idem: IDEM, amount: 2300 }, fcfa).replace(/ /g, " ");
  assertEquals(echo, "Je propose 2 300 FCFA");
  assertEquals(actionEcho({ action: "pay_mode", idem: IDEM, method: "cash" }, fcfa), "Paiement cash à la livraison");
});

// --------------------------------------------------------------- texte libre
Deno.test("texte libre : offre confirmée, autres règles déterministes conservées", () => {
  const neg = { stage: "negotiation" as const, role: "buyer" as const };
  const offer = classifyDeterministic("je propose 2300", neg);
  assertEquals([offer?.action, offer?.execute, offer?.needsConfirm], ["offer", false, true]);
  assertEquals(classifyDeterministic("ok", neg)?.action, "accept");
  assertEquals(classifyDeterministic("non merci", neg)?.action, "reject");
  assertEquals(classifyDeterministic("Il est neuf ?", neg)?.action, "ask");
  assertEquals(classifyDeterministic("momo", { stage: "agreement", role: "buyer" })?.method, "mobile_money");
  assertEquals(classifyDeterministic("il est disponible", { stage: "agreement", role: "seller" })?.action, "seller_confirm");
});

Deno.test("texte libre : paiement et annulation déduits d'une phrase => confirmation obligatoire", () => {
  const paid = classifyDeterministic("j'ai payé", { stage: "delivery", role: "buyer" });
  assertEquals([paid?.action, paid?.execute, paid?.needsConfirm], ["confirm_payment", false, true]);
  const cancel = classifyDeterministic("j'annule", { stage: "agreement", role: "buyer" });
  assertEquals([cancel?.action, cancel?.execute], ["cancel", false]);
});

Deno.test("références au contexte : « le 2 », « le deuxième », « celui à 2 500 »", () => {
  const results = [
    { index: 1, articleId: "a1", price: 1500 },
    { index: 2, articleId: "a2", price: 2500 },
  ];
  assertEquals(resolveResultReference("le 2", results)?.articleId, "a2");
  assertEquals(resolveResultReference("le deuxième", results)?.articleId, "a2");
  assertEquals(resolveResultReference("celui à 2 500", results)?.articleId, "a2");
  assertEquals(resolveResultReference("le 9", results), null);
  assertEquals(classifyDeterministic("le 1", { stage: "interest", role: "buyer", lastResults: results })?.articleId, "a1");
});

Deno.test("modèle : schéma fermé, seuils, argent jamais exécuté sans tap", async () => {
  const ctx = { stage: "negotiation" as const, role: "buyer" as const };
  const high = sanitizeModelOutput({ action: "accept", confidence: 0.97 }, ctx);
  assertEquals([high.action, high.execute, high.needsConfirm], ["accept", false, true]);
  const ask = sanitizeModelOutput({ action: "ask", confidence: 0.9, question: "Couleur ?" }, ctx);
  assertEquals([ask.action, ask.execute], ["ask", true]);
  const mid = sanitizeModelOutput({ action: "ask", confidence: 0.7 }, ctx);
  assertEquals([mid.execute, mid.needsConfirm], [false, true]);
  const low = sanitizeModelOutput({ action: "reject", confidence: 0.4 }, ctx);
  assertEquals([low.execute, low.needsConfirm], [false, false]);
  assertEquals(sanitizeModelOutput({ action: "drop_table", confidence: 1 }, ctx).action, "none");
  const micro = sanitizeModelOutput({ action: "offer", confidence: 1, amount: 12 }, ctx);
  assertEquals([micro.action, micro.amount, micro.execute, micro.needsConfirm], ["offer", 12, false, true]);
  assertEquals(sanitizeModelOutput({ action: "offer", confidence: 1, amount: 0 }, ctx).action, "none");
  assertEquals(sanitizeModelOutput({ action: "pay_mode", confidence: 1, method: "cash" }, ctx).action, "none", "hors étape");
  // Le modèle n'est consulté que si les règles ne tranchent pas.
  let calls = 0;
  const r = await classifyFreeText("je propose 2000", ctx, () => { calls += 1; return Promise.resolve({}); });
  assertEquals([r.action, calls], ["offer", 0]);
  const r2 = await classifyFreeText("bof pas trop", ctx, () => { calls += 1; return Promise.resolve({ action: "none", confidence: 0.9 }); });
  assertEquals([r2.action, calls], ["none", 1]);
});

// --------------------------------------------------------------- prédictif
Deno.test("prix suggéré : milieu des offres, borné, arrondi à 25", () => {
  assertEquals(suggestPrice({ buyerOffer: 2000, sellerOffer: 2500 }), 2250);
  assertEquals(suggestPrice({ buyerOffer: 2010, sellerOffer: 2500 }), 2250);
  assertEquals(suggestPrice({ sellerOffer: 2500 }), 2250);
  assertEquals(suggestPrice({ buyerOffer: 1000, sellerOffer: 1200, marketMin: 1500, marketMax: 1800 }), 1500);
  assertEquals(suggestPrice({}), null);
});

Deno.test("meilleure action : écart ≤ 3 % => Accepter en premier", () => {
  assertEquals(acceptFirst(2450, 2400), true);
  assertEquals(acceptFirst(2600, 2400), false);
  assertEquals(acceptFirst(2600, null), true);
});

Deno.test("délai médian : null sous 5 échantillons", () => {
  assertEquals(medianResponseMinutes([5, 10, 15, 20]), null);
  assertEquals(medianResponseMinutes([5, 10, 15, 20, 90]), 15);
  const t = (m: number) => new Date(Date.UTC(2026, 8, 27, 10, m)).toISOString();
  const samples = responseSamples([
    { at: t(0), role: "buyer" }, { at: t(12), role: "seller" },
    { at: t(20), role: "buyer" }, { at: t(21), role: "buyer" }, { at: t(30), role: "seller" },
  ], "seller");
  assertEquals(samples, [12, 10]);
});

Deno.test("relances 2 h / 24 h, expiration 72 h, paiement présélectionné, intention", () => {
  const start = Date.UTC(2026, 8, 27, 10, 0);
  const plan = followUpPlan(start, start + 3 * 3600_000);
  assertEquals(plan.followUps.length, 2);
  assertEquals(plan.nextFollowUpAt, new Date(start + 24 * 3600_000).toISOString());
  assertEquals(followUpPlan(start, start + 73 * 3600_000).expired, true);
  assertEquals(preselectPayment(["cash", "cash", "mobile_money"]), "cash");
  assertEquals(preselectPayment(["cash"]), null);
  assert(purchaseIntent({ asked: true, offered: true, offerToListRatio: 0.9 }) > purchaseIntent({}));
  assert(purchaseIntent({ asked: true, offered: true, offerToListRatio: 5, returnVisits: 99 }) <= 100);
});

Deno.test("aucune fenêtre froide : chaque état actif propose au moins une action", () => {
  const neg: DealState = { ...base, negotiationId: NEG, negotiationState: "proposed", lastActor: "buyer", lastOfferPrice: 2300 };
  const agreement: DealState = { ...base, negotiationId: NEG, negotiationState: "accepted", dealId: DEAL, dealStatus: "awaiting_confirmation" };
  const sellerDone: DealState = { ...agreement, sellerConfirmed: true };
  const states: Array<[string, DealState]> = [
    ["interest", base],
    ["négociation", neg],
    ["accord", agreement],
    ["accord, vendeur confirmé", sellerDone],
    ["préparation", { ...agreement, dealStatus: "pending_assignment" }],
    ["livreur en route", { ...agreement, dealStatus: "assigned" }],
    ["livré", { ...agreement, dealStatus: "delivered", paymentMethod: "cash" }],
  ];
  for (const [label, state] of states) {
    for (const role of ["buyer", "seller"] as const) {
      if (label === "interest" && role === "seller") continue; // le vendeur n'a rien à faire avant l'offre
      const actions = nextActions(state, role);
      assert(actions.length >= 1 && actions.length <= 3, `${label}/${role}: ${actions.length} bouton(s)`);
    }
  }
});

Deno.test("accord tombé (commande annulée) : l'acheteur retrouve les boutons d'entrée", () => {
  const cancelled: DealState = { ...base, negotiationId: NEG, negotiationState: "accepted", dealId: null, dealStatus: null };
  assertEquals(nextActions(cancelled, "buyer").map((a) => parseActionPayload(a.id)?.kind), ["open_deal", "offer_prompt", "ask"]);
  assertEquals(nextActions(cancelled, "seller"), []);
});

Deno.test("boutons d'attente : identifiants reconnus par les clients (poser-question, proposer-prix, annuler)", () => {
  const neg: DealState = { ...base, negotiationId: NEG, negotiationState: "proposed", lastActor: "buyer", lastOfferPrice: 2300 };
  for (const a of nextActions(neg, "buyer")) assert(parseActionPayload(a.id), a.id);
  const paid: DealState = { ...base, negotiationId: NEG, negotiationState: "accepted", dealId: DEAL, dealStatus: "awaiting_confirmation", paymentSelected: true };
  for (const a of nextActions(paid, "buyer")) assert(parseActionPayload(a.id), a.id);
});

// --- Résultats Nexus externes -------------------------------------------------------------------
const EXT_UUID = "d1a00000-0000-4000-8000-000000000001";
const extState = {
  articleId: "a1", articlePrice: 150000, negotiationId: "n1", negotiationState: "proposed", lastActor: "buyer",
  lastOfferPrice: 130000, dealId: null, dealStatus: null, sellerConfirmed: false, paymentSelected: false,
  paymentMethod: null, externalSeller: true, externalTransmitted: false,
} as const;

Deno.test("nexus : fabric_id external:/article: accepté, buyer: et format libre refusés", () => {
  const ok = validateActionRequest({ action: "open_deal", idem: "idem-nexus-01", fabric_id: `EXTERNAL:${EXT_UUID.toUpperCase()}` });
  assert(ok.ok && ok.request.fabric_id === `external:${EXT_UUID}`);
  assertEquals(validateActionRequest({ action: "open_deal", idem: "idem-nexus-02", fabric_id: `buyer:${EXT_UUID}` }), { ok: false, error: "invalid_fabric_id" });
  assertEquals(validateActionRequest({ action: "open_deal", idem: "idem-nexus-03", fabric_id: "external:abc" }), { ok: false, error: "invalid_fabric_id" });
  assertEquals(validateActionRequest({ action: "offer", idem: "idem-nexus-04", amount: 5000, fabric_id: `external:${EXT_UUID}` }).ok, true);
});

Deno.test("nexus : transmit_offer exige une négociation ou un fil", () => {
  assertEquals(validateActionRequest({ action: "transmit_offer", idem: "idem-nexus-05" }), { ok: false, error: "negotiation_id_required" });
  assertEquals(validateActionRequest({ action: "transmit_offer", idem: "idem-nexus-06", negotiation_id: EXT_UUID }).ok, true);
});

Deno.test("nexus : offre prête → « Envoyer mon offre » en premier, jamais de bouton vendeur", () => {
  const buyer = nextActions({ ...extState }, "buyer");
  assertEquals(buyer.map((a) => a.id), ["envoyer-offre:n1", "proposer-prix:a1"]);
  assertEquals(nextActions({ ...extState }, "seller"), []);
});

Deno.test("nexus : offre transmise → plus de bouton d'envoi, l'acheteur peut encore modifier", () => {
  const after = nextActions({ ...extState, externalTransmitted: true }, "buyer");
  assertEquals(after.map((a) => a.id), ["proposer-prix:a1"]);
});

Deno.test("nexus : l'alias envoyer-offre est reconnu par le parseur unique", () => {
  const cmd = parseActionPayload("envoyer-offre:d1a00000-0000-4000-8000-000000000001");
  assertEquals(cmd?.kind, "transmit_offer");
  assertEquals(cmd?.scope, "negotiation");
});
