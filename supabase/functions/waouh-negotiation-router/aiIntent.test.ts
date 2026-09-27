// Tests du parseur réellement utilisé par waouh-negotiation-router.
// Avant le 27/09/2026, ce fichier testait une COPIE divergente du parseur
// (la vraie fonction n'était pas exportable) : les tests passaient sans
// protéger le code exécuté. Le parseur vit désormais dans
// _shared/waouh-negotiation-intent.ts ; les cas complets sont dans
// _shared/waouh-negotiation-intent-test.ts. On garde ici les cas historiques.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseNegotiationIntent } from "../_shared/waouh-negotiation-intent.ts";

const cases: Array<[string, { kind: string; price?: number } | null]> = [
  ["oui", { kind: "yes" }],
  ["OK", { kind: "yes" }],
  ["d'accord", { kind: "yes" }],
  ["deal", { kind: "yes" }],
  ["ça marche", { kind: "yes" }],
  ["non", { kind: "no" }],
  ["nope", { kind: "no" }],
  ["pas d'accord", { kind: "no" }],
  ["je propose 400", { kind: "price", price: 400 }],
  ["Je propose 5000 FCFA", { kind: "price", price: 5000 }],
  ["contre-offre 12000", { kind: "price", price: 12000 }],
  ["contre offre 12000", { kind: "price", price: 12000 }],
  ["12 500 fcfa", { kind: "price", price: 12500 }],
  ["12.500 FCFA", { kind: "price", price: 12500 }],
  ["400", { kind: "price", price: 400 }],
  ["  12 500  ", { kind: "price", price: 12500 }],
  ["pour 7500", { kind: "price", price: 7500 }],
  ["bonjour", null], // ambigu : confié à l'IA puis validé
  ["", { kind: "other" }],
  ["12", null], // < 100 : rejeté comme prix
];

for (const [input, expected] of cases) {
  Deno.test(`aiIntent (réel): "${input}"`, () => {
    assertEquals(parseNegotiationIntent(input) as any, expected);
  });
}
