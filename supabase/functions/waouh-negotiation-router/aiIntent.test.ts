// Tests déterministes du parseur aiIntent (branche regex sans fallback IA).
// On réimplémente la branche déterministe pour la tester unitairement
// sans déclencher le réseau (fetch Lovable Gateway).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

function deterministicIntent(text: string): { kind: "yes"|"no"|"price"|"other"; price?: number } {
  const lower = (text || "").trim().toLowerCase();
  if (/\b(non|no|refuse|refus[eé]|pas\s+d['']accord|nope)\b/i.test(lower)) return { kind: "no" };
  if (/\b(oui|ok|d'?accord|j'accepte|accept[eé]|yes|deal|ça\s+marche|ca\s+marche)\b/i.test(lower) && !/propose|offre|contre/.test(lower)) return { kind: "yes" };
  let m: RegExpMatchArray | null = lower.match(/(\d{2,3}(?:[\s.,]?\d{3})+|\d{3,9})\s*(?:f|fcfa|cfa)\b/i);
  if (!m) m = lower.match(/(?:propose|offre|offre\s+de|contre[\s-]?offre|prix|pour|à)\s*(\d{2,3}(?:[\s.,]?\d{3})+|\d{3,9})/i);
  if (!m) {
    const cleaned = lower.replace(/[\s.,]/g, "");
    if (/^\d{3,9}$/.test(cleaned)) m = [cleaned, cleaned] as any;
  }
  if (m) {
    const price = parseInt(String(m[1]).replace(/\D/g, ""), 10);
    if (price >= 100 && price <= 100_000_000) return { kind: "price", price };
  }
  return { kind: "other" };
}

const cases: Array<[string, { kind: string; price?: number }]> = [
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
  ["bonjour", { kind: "other" }],
  ["", { kind: "other" }],
  ["12", { kind: "other" }], // < 100, rejeté
];

for (const [input, expected] of cases) {
  Deno.test(`aiIntent: "${input}"`, () => {
    const got = deterministicIntent(input);
    assertEquals(got.kind, expected.kind, `kind mismatch for "${input}"`);
    if (expected.price !== undefined) {
      assertEquals(got.price, expected.price, `price mismatch for "${input}"`);
    }
  });
}
