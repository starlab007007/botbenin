/** Repère clé d'une carte selon le parcours : un seul fait utile, en mots simples. */
export type JourneyKind = "purchase" | "sale" | "service" | "project" | "opportunity";
type Row = { nearby?: boolean; city?: string | null; observed_at?: string | null; expires_at?: string | null; price_max?: number | null; evidence?: Record<string, unknown> | null; contact_policy?: { level?: string | null } | null };

const DAY = 86_400_000;
const deadlineOf = (r: Row) => {
  const e = r.evidence ?? {};
  for (const v of [e.deadline, e.closing_date, e.expires_at, r.expires_at]) { const t = typeof v === "string" ? Date.parse(v) : NaN; if (Number.isFinite(t)) return t; }
  return null;
};

export function journeyChip(r: Row, kind: JourneyKind, now = Date.now()): { label: string; tone: "good" | "warn" | "info" } | null {
  if (r.nearby) return { label: r.city ? `Ville proche · ${r.city}` : "Ville proche", tone: "info" };
  if (kind === "opportunity") {
    const d = deadlineOf(r); if (d == null) return { label: "Date limite à vérifier", tone: "warn" };
    const days = Math.ceil((d - now) / DAY);
    return days <= 0 ? { label: "Clôturé", tone: "warn" } : { label: days === 1 ? "Dernier jour" : `${days} jours restants`, tone: days <= 3 ? "warn" : "good" };
  }
  if (kind === "sale") {
    const t = r.observed_at ? Date.parse(r.observed_at) : NaN;
    if (!Number.isFinite(t)) return null;
    const days = Math.floor((now - t) / DAY);
    return { label: days <= 0 ? "Demande du jour" : `Demande d'il y a ${days} j`, tone: days <= 3 ? "good" : "info" };
  }
  if (kind === "service" || kind === "project") {
    const lvl = String(r.contact_policy?.level ?? "C0");
    return lvl >= "C1" ? { label: "Joignable", tone: "good" } : { label: "Contact à trouver", tone: "warn" };
  }
  return null;
}
