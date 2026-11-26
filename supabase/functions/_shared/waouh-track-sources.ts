// Règles de recherche par parcours : combien de résultats suffisent, où élargir,
// et quelles sources solliciter en direct quand la réserve ne suffit pas.
import type { MissionKind } from "./waouh-mission-domain.ts";

export type TrackRule = { minResults: number; liveSources: Array<"web" | "places">; widenCity: boolean; requireDeadline: boolean };

export const TRACK_RULES: Record<MissionKind, TrackRule> = {
  purchase: { minResults: 3, liveSources: ["web"], widenCity: true, requireDeadline: false },
  sale: { minResults: 1, liveSources: ["web"], widenCity: true, requireDeadline: false },
  service: { minResults: 3, liveSources: ["places", "web"], widenCity: true, requireDeadline: false },
  project: { minResults: 2, liveSources: ["web", "places"], widenCity: true, requireDeadline: false },
  opportunity: { minResults: 2, liveSources: ["web"], widenCity: false, requireDeadline: false },
};

export function trackRule(kind: MissionKind | null | undefined): TrackRule {
  return TRACK_RULES[kind ?? "purchase"] ?? TRACK_RULES.purchase;
}

const NEIGHBORS: Record<string, string[]> = {
  cotonou: ["Abomey-Calavi", "Godomey", "Porto-Novo", "Ouidah"],
  "abomey-calavi": ["Cotonou", "Godomey", "Ouidah"],
  godomey: ["Cotonou", "Abomey-Calavi"],
  "porto-novo": ["Cotonou", "Sèmè-Kpodji"],
  ouidah: ["Cotonou", "Abomey-Calavi", "Pahou"],
  pahou: ["Ouidah", "Cotonou"],
  bohicon: ["Abomey", "Cotonou"],
  abomey: ["Bohicon", "Cotonou"],
  parakou: ["Djougou", "Bohicon"],
};
const key = (c: string) => c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, "-");
export function neighborCities(city: string | null | undefined): string[] {
  return city ? NEIGHBORS[key(city)] ?? [] : [];
}

/** Faut-il élargir ou chercher en direct ? */
export function needsMore(kind: MissionKind | null | undefined, count: number): boolean {
  return count < trackRule(kind).minResults;
}

/** Une opportunité sans échéance future n'est pas proposée ; les autres parcours tolèrent l'absence. */
export function deadlineAcceptable(kind: MissionKind | null | undefined, deadline: number | null, now = Date.now()): boolean {
  if (deadline != null) return deadline > now;
  return !trackRule(kind).requireDeadline;
}

/** Fusionne sans doublon, en gardant d'abord les résultats exacts. */
export function mergeResults<T extends { fabric_id?: string | null; source_url?: string | null }>(first: T[], extra: T[], tag: Record<string, unknown>): T[] {
  const seen = new Set(first.map((r) => r.fabric_id ?? r.source_url));
  return [...first, ...extra.filter((r) => { const k = r.fabric_id ?? r.source_url; if (seen.has(k)) return false; seen.add(k); return true; }).map((r) => ({ ...r, ...tag }))];
}

/** Catégories : une seule appellation par famille. */
const CATEGORY_MAP: Array<[RegExp, string]> = [
  [/t[ée]l[ée]phon|smartphone|tablette/i, "Téléphones & Tablettes"],
  [/ordinateur|informatique/i, "Informatique"],
  [/fourniture/i, "Fournitures"],
  [/voiture|v[ée]hicule/i, "Voitures"],
  [/moto/i, "Motos"],
  [/terrain|immobili|maison|appartement/i, "Immobilier"],
  [/march[ée]s? publics?|appel d.offres/i, "Marchés publics"],
];
export function canonicalCategory(value: string | null | undefined): string | null {
  if (!value) return null;
  const clean = value.replace(/^[^\p{L}\d]+/u, "").trim();
  for (const [re, name] of CATEGORY_MAP) if (re.test(clean)) return name;
  return clean || null;
}
