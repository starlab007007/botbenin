// Shared helper — extract meaningful search tokens from a free-text buyer query.
// Used as a fallback when the AI extractor returns empty / generic keywords.

const STOP_WORDS = new Set([
  "je","j","tu","il","elle","on","nous","vous","ils","elles",
  "cherche","recherche","recherches","besoin","veux","voudrais","souhaite",
  "acheter","achete","achète","achetent","prendre","trouver","avoir",
  "un","une","des","du","de","la","le","les","l","au","aux","à","a",
  "pour","avec","sans","dans","sur","en","par","ou","et","mais",
  "mon","ma","mes","ton","ta","tes","son","sa","ses","notre","votre",
  "ce","cet","cette","ces","ça","ca","ici","là","la","plus","moins",
  "svp","stp","merci","bonjour","salut","hello","hi","ok",
  "produit","produits","article","articles","chose","truc","item",
  "neuf","occasion","fcfa","cfa","franc","francs","prix",
  "cotonou","calavi","porto","novo","abomey","parakou","benin","bénin",
]);

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function extractFallbackKeywords(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  const normalized = stripAccents(text.toLowerCase());
  const tokens = normalized
    .replace(/[^a-z0-9\s\-']/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .filter((t) => !/^\d+$/.test(t))
    .filter((t) => !STOP_WORDS.has(t));
  // dédoublonne en gardant l'ordre
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) { seen.add(t); out.push(t); }
    if (out.length >= 6) break;
  }
  return out;
}
