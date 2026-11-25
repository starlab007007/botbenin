// Règles de mise en avant NEXUS : complétude et fraîcheur d'une fiche.
// - complète = titre + ville + (prix ou contact joignable)
// - produit de plus de 30 jours : déclassé ; plus de 60 jours : masqué
export const FRESH_DOWNGRADE_DAYS = 30;
export const FRESH_HIDE_DAYS = 60;

export type QualityInput = {
  subject?: string | null; city?: string | null; price_min?: number | string | null; price_max?: number | string | null;
  contactability_level?: string | null; observed_at?: string | null;
};

export function fabricQuality(s: QualityInput, isGoods: boolean, now = Date.now()) {
  const price = Number(s.price_min ?? s.price_max ?? 0);
  const reachable = ["C2", "C3", "C4", "C5"].includes(String(s.contactability_level ?? "C0"));
  const complete = Boolean(String(s.subject ?? "").trim() && String(s.city ?? "").trim() && (price > 0 || reachable));
  const t = s.observed_at ? Date.parse(s.observed_at) : NaN;
  const ageDays = Number.isFinite(t) ? Math.max(0, (now - t) / 86_400_000) : null;
  const hidden = isGoods && ageDays !== null && ageDays > FRESH_HIDE_DAYS;
  const stale = isGoods && ageDays !== null && ageDays > FRESH_DOWNGRADE_DAYS;
  const factor = hidden ? 0 : (stale ? 0.7 : 1) * (complete ? 1 : 0.6);
  return { complete, ageDays, stale, hidden, factor };
}
