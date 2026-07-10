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

/**
 * Génère des variantes d'un mot-clé pour un ilike plus tolérant :
 *  - minuscule
 *  - sans accents
 *  - stemming léger (retire "s", "es", "x" final)
 *  - décomposition en tokens si multi-mots ("iphone 12" → ["iphone", "12"])
 * Retourne des tokens uniques, filtrés (>=2 chars).
 */
export function expandKeywordVariants(input: string | string[]): string[] {
  const arr = Array.isArray(input) ? input : [input];
  const out = new Set<string>();
  for (const raw of arr) {
    if (!raw || typeof raw !== "string") continue;
    const base = stripAccents(raw.toLowerCase()).trim();
    if (!base) continue;
    // tokens (multi-mots) — min 3 chars pour éviter les substrings trop courts
    // (ex: "za" matcherait tout titre contenant "za").
    const parts = base.split(/[\s\-']+/).filter((p) => p.length >= 3);
    const all = base.length >= 3 ? [base, ...parts] : parts;
    for (const t of all) {
      if (t.length < 3) continue;
      out.add(t);
      // stemming léger — uniquement mots >= 6 chars (préserve "zara", "mixa"…)
      if (t.length >= 6) {
        if (t.endsWith("es")) out.add(t.slice(0, -2));
        else if (t.endsWith("s") || t.endsWith("x")) out.add(t.slice(0, -1));
      }
    }
  }
  return Array.from(out).slice(0, 12);
}

/** Échappe les caractères spéciaux d'un pattern PostgREST ilike (%, _, ,, ()). */
export function escapeIlikeToken(k: string): string {
  return k.replace(/[,()%_*]/g, " ").trim();
}

/**
 * Post-filter local : ne garde une ligne que si au moins un token complet
 * (>=3 chars) apparaît dans les champs textuels fournis. Empêche PostgREST
 * de renvoyer des résultats sans rapport avec la requête réelle.
 */
export function matchesAnyKeyword(
  fields: Array<string | null | undefined>,
  keywords: string[]
): boolean {
  if (!keywords || keywords.length === 0) return true;
  const hay = stripAccents(fields.filter(Boolean).join(" ").toLowerCase());
  return keywords.some((k) => {
    const kk = stripAccents(String(k || "").toLowerCase().trim());
    return kk.length >= 3 && hay.includes(kk);
  });
}
