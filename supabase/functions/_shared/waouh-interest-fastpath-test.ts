// Tests de la décision « ouverture directe de la Deal Room » (Lot 1).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  decideFastPath,
  type FastPathInput,
  isExplicitOfferText,
  metaSignalsAsk,
  metaSignalsInterest,
} from "./waouh-interest-fastpath.ts";
import { extractOfferAmount } from "./waouh-negotiation-intent.ts";

const ART = "3f2c1b0a-0000-4000-8000-00000000a001";
const NEG = "a1b2c3d4-0000-4000-8000-00000000abcd";

function input(overrides: Partial<FastPathInput> = {}): FastPathInput {
  const text = overrides.text ?? "";
  return {
    enabled: true, articleId: ART, actorIsSeller: false, metaRole: null,
    articleButtonKind: null, interestSignal: false, askSignal: false,
    offerAmount: extractOfferAmount(text), explicitOffer: isExplicitOfferText(text),
    shouldStayInCore: false, textIsLabel: false, text, openNegotiation: null, ...overrides,
  };
}

Deno.test("capture 1 : intérêt + prix sans négociation => ouverture avec l'offre", () => {
  assertEquals(decideFastPath(input({ text: "Je propose 2 300 FCFA pour « Chaussures »", interestSignal: true })), { kind: "open", offer: 2300 });
});
Deno.test("prix seul sur un article connu => ouverture (plus de « Aucune négociation »)", () => {
  assertEquals(decideFastPath(input({ text: "2300" })), { kind: "open", offer: 2300 });
  assertEquals(decideFastPath(input({ text: "je propose 2500" })), { kind: "open", offer: 2500 });
});
Deno.test("un chiffre dans une phrase n'ouvre pas de négociation", () => {
  assertEquals(decideFastPath(input({ text: "La livraison à 500 m c'est possible ?" })), { kind: "none" });
});
Deno.test("intérêt sans montant => ouverture au prix affiché", () => {
  assertEquals(decideFastPath(input({ text: "Intéressé", interestSignal: true })), { kind: "open", offer: null });
});
Deno.test("« intéressé 2 » reste au moteur (liste de résultats)", () => {
  assertEquals(decideFastPath(input({ text: "intéressé 2", interestSignal: false, shouldStayInCore: true })), { kind: "none" });
});
Deno.test("même offre déjà envoyée par l'acheteur => pas de doublon", () => {
  assertEquals(decideFastPath(input({ text: "Je propose 2300 FCFA", interestSignal: true, openNegotiation: { id: NEG, lastActor: "buyer", lastOfferPrice: 2300 } })), { kind: "awaiting", amount: 2300 });
});
Deno.test("nouveau montant sur négociation existante => routeur canonique", () => {
  assertEquals(decideFastPath(input({ text: "je propose 2100", openNegotiation: { id: NEG, lastActor: "seller", lastOfferPrice: 2400 } })), { kind: "none" });
});
Deno.test("intérêt répété sur négociation existante => reprise", () => {
  assertEquals(decideFastPath(input({ text: "Intéressé", interestSignal: true, openNegotiation: { id: NEG, lastActor: "seller", lastOfferPrice: 2400 } })), { kind: "resume" });
});
Deno.test("boutons de fiche produit", () => {
  assertEquals(decideFastPath(input({ articleButtonKind: "open_deal", textIsLabel: true })), { kind: "open", offer: null });
  assertEquals(decideFastPath(input({ articleButtonKind: "offer_prompt", textIsLabel: true })), { kind: "open_thread", prompt: "offer" });
  assertEquals(decideFastPath(input({ articleButtonKind: "ask", textIsLabel: true })), { kind: "open_thread", prompt: "question" });
  assertEquals(decideFastPath(input({ articleButtonKind: "ask", text: "Il est encore sous garantie ?" })), { kind: "relay_question", question: "Il est encore sous garantie ?" });
});
Deno.test("vendeur, interrupteur coupé ou article absent => aucun effet", () => {
  assertEquals(decideFastPath(input({ text: "2300", actorIsSeller: true })), { kind: "none" });
  assertEquals(decideFastPath(input({ text: "2300", metaRole: "seller" })), { kind: "none" });
  assertEquals(decideFastPath(input({ text: "2300", enabled: false })), { kind: "none" });
  assertEquals(decideFastPath(input({ text: "2300", articleId: null })), { kind: "none" });
});
Deno.test("signaux meta", () => {
  assertEquals(metaSignalsInterest({ intent: "interested" }), true);
  assertEquals(metaSignalsInterest({ commerce_action: "open_deal" }), true);
  assertEquals(metaSignalsInterest({ action: "counter" }), false);
  assertEquals(metaSignalsAsk({ commerce_action: "ask" }), true);
  assertEquals(metaSignalsAsk({}), false);
});
Deno.test("offre explicite", () => {
  for (const t of ["je propose 2000", "2 300 FCFA", "2300", "Offre : 5000", "ok pour 7500"]) assertEquals(isExplicitOfferText(t), true, t);
  for (const t of ["livraison à 500 m", "il a 2 ans", "modèle 2024", "question sans prix"]) assertEquals(isExplicitOfferText(t), false, t);
});
