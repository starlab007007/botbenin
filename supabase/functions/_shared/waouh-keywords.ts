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
 * (>=3 chars) apparaît comme MOT dans les champs textuels fournis (frontière
 * de mot, tolérance pluriel). Empêche « sac » de matcher « sachet ».
 */
export function matchesAnyKeyword(
  fields: Array<string | null | undefined>,
  keywords: string[]
): boolean {
  if (!keywords || keywords.length === 0) return true;
  const hay = normalizeHay(fields);
  return keywords.some((k) => hayHasWord(hay, k));
}

function normalizeHay(fields: Array<string | null | undefined>): string {
  return " " + stripAccents(fields.filter(Boolean).join(" ").toLowerCase())
    .replace(/[^a-z0-9]+/g, " ")
    .trim() + " ";
}

/** true si `kw` apparaît comme mot entier (avec tolérance pluriel s/x/es). */
function hayHasWord(hay: string, kw: string): boolean {
  const k = stripAccents(String(kw || "").toLowerCase()).replace(/[^a-z0-9]+/g, " ").trim();
  if (k.length < 3) return false;
  // multi-mots : tous les sous-tokens doivent être présents comme mots
  const parts = k.split(" ").filter((p) => p.length >= 2);
  if (parts.length > 1) {
    return parts.every((p) => new RegExp(`(^| )${escapeRe(p)}(s|x|es)?( |$)`).test(hay));
  }
  return new RegExp(`(^| )${escapeRe(k)}(s|x|es)?( |$)`).test(hay);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Score de pertinence d'une ligne pour une requête.
 * - +3 par token distinct trouvé dans le titre
 * - +1 par token distinct trouvé dans les autres champs
 * - +4 bonus si TOUS les tokens sont présents (match exact multi-mots)
 * Retourne 0 si aucun token ne matche.
 */
export function scoreRelevance(
  title: string | null | undefined,
  otherFields: Array<string | null | undefined>,
  keywords: string[]
): number {
  const kws = (keywords || []).filter((k) => typeof k === "string" && k.trim().length >= 3);
  if (kws.length === 0) return 1;
  const titleHay = normalizeHay([title]);
  const restHay = normalizeHay(otherFields);
  let score = 0;
  let found = 0;
  for (const k of kws) {
    const inTitle = hayHasWord(titleHay, k);
    const inRest = hayHasWord(restHay, k);
    if (inTitle) { score += 3; found++; }
    else if (inRest) { score += 1; found++; }
  }
  if (found === 0) return 0;
  if (found === kws.length && kws.length > 1) score += 4;
  return score;
}

/**
 * Catégorie sûre : n'accepte QUE la catégorie renvoyée par l'IA et seulement
 * si elle correspond exactement à une valeur connue. Retourne null sinon —
 * la catégorie ne doit jamais devenir un filtre dur deviné depuis le texte.
 */
const KNOWN_CATEGORIES = [
  "smartphone", "ordinateur", "vetement", "vehicule", "electromenager", "meuble",
];

export function normalizeCategorySafe(value: string | null | undefined): string | null {
  const v = stripAccents(String(value || "").toLowerCase().trim());
  if (!v || v === "autre") return null;
  return KNOWN_CATEGORIES.includes(v) ? v : null;
}

