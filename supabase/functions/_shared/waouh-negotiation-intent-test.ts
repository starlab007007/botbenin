// Tests du parseur de négociation (code réellement exécuté par le routeur).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  canAcceptOffer,
  extractOfferAmount,
  parseNegotiationIntent,
  sanitizeAiIntent,
} from "./waouh-negotiation-intent.ts";

const NEG_DIGITS = "4071a123-5678-4f12-a345-123456789f12"; // commence par des chiffres, contient "a123", "5678", "345f"

Deno.test("régression : un identifiant de bouton ne produit jamais un prix", () => {
  assertEquals(parseNegotiationIntent(`contre-proposition:${NEG_DIGITS}`), { kind: "counter_prompt" });
  assertEquals(parseNegotiationIntent("💬 Contre-proposer", `contre-proposition:${NEG_DIGITS}`), { kind: "counter_prompt" });
  assertEquals(parseNegotiationIntent(`accepter:${NEG_DIGITS}`), { kind: "yes" });
  assertEquals(parseNegotiationIntent(`refuser:${NEG_DIGITS}`), { kind: "no" });
  assertEquals(extractOfferAmount(NEG_DIGITS), null);
  assertEquals(extractOfferAmount("réf-a345-x"), null);
  assertEquals(extractOfferAmount("offre=5000"), 5000);
  assertEquals(extractOfferAmount("je propose: 5000"), 5000);
  assertEquals(extractOfferAmount("à 12 000"), 12000);
});

Deno.test("libellés de boutons reçus sans identifiant (WhatsApp)", () => {
  assertEquals(parseNegotiationIntent("💬 Contre-proposer"), { kind: "counter_prompt" });
  assertEquals(parseNegotiationIntent("💬 Faire une contre-offre"), { kind: "counter_prompt" });
  assertEquals(parseNegotiationIntent("✅ Accepter"), { kind: "yes" });
  assertEquals(parseNegotiationIntent("✅ Accepter le prix"), { kind: "yes" });
  assertEquals(parseNegotiationIntent("❌ Refuser"), { kind: "no" });
});

// Cas historiques de aiIntent.test.ts, désormais sur le vrai code.
const cases: Array<[string, unknown]> = [
  ["oui", { kind: "yes" }],
  ["OK", { kind: "yes" }],
  ["d'accord", { kind: "yes" }],
  ["deal", { kind: "yes" }],
  ["ça marche", { kind: "yes" }],
  ["non", { kind: "no" }],
  ["nope", { kind: "no" }],
  ["pas d'accord", { kind: "no" }],
  ["je propose 80", { kind: "price", price: 80 }],
  ["80 FCFA", { kind: "price", price: 80 }],
  ["je propose 400", { kind: "price", price: 400 }],
  ["Je propose 5000 FCFA", { kind: "price", price: 5000 }],
  ["contre-offre 12000", { kind: "price", price: 12000 }],
  ["contre offre 12000", { kind: "price", price: 12000 }],
  ["12 500 fcfa", { kind: "price", price: 12500 }],
  ["12.500 FCFA", { kind: "price", price: 12500 }],
  ["12 500 F CFA", { kind: "price", price: 12500 }],
  ["400", { kind: "price", price: 400 }],
  ["  12 500  ", { kind: "price", price: 12500 }],
  ["pour 7500", { kind: "price", price: 7500 }],
  ["je propose", { kind: "counter_prompt" }],
  ["", { kind: "other" }],
  ["12", { kind: "price", price: 12 }],
  ["bonjour", null],     // ambigu → IA
];
for (const [input, expected] of cases) {
  Deno.test(`parseNegotiationIntent: ${JSON.stringify(input)}`, () => {
    assertEquals(parseNegotiationIntent(input), expected as any);
  });
}

Deno.test("« ok pour 7500 » = offre à 7500, pas acceptation de l'ancien prix", () => {
  assertEquals(parseNegotiationIntent("ok pour 7500"), { kind: "price", price: 7500, affirmative: true });
  assertEquals(parseNegotiationIntent("oui je prends à 25 000 f"), { kind: "price", price: 25000, affirmative: true });
});

Deno.test("sortie IA validée", () => {
  assertEquals(sanitizeAiIntent({ kind: "yes" }), { kind: "yes" });
  assertEquals(sanitizeAiIntent({ kind: "price", price: 15000 }), { kind: "price", price: 15000 });
  assertEquals(sanitizeAiIntent({ kind: "price", price: 12 }), { kind: "price", price: 12 });
  assertEquals(sanitizeAiIntent({ kind: "price", price: 0 }), { kind: "other" });
  assertEquals(sanitizeAiIntent({ kind: "price" }), { kind: "other" });
  assertEquals(sanitizeAiIntent({ kind: "delete_everything" }), { kind: "other" });
  assertEquals(sanitizeAiIntent(null), { kind: "other" });
});

Deno.test("on n'accepte pas sa propre offre", () => {
  assertEquals(canAcceptOffer("buyer", "buyer"), false);
  assertEquals(canAcceptOffer("seller", "seller"), false);
  assertEquals(canAcceptOffer("buyer", "seller"), true);
  assertEquals(canAcceptOffer("seller", "buyer"), true);
  assertEquals(canAcceptOffer(null, "buyer"), true);
});
