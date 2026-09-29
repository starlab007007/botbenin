// WAOUH — Notes de l'avatar (points d'avancement, synthèse) — parité serveur :
// supabase/functions/_shared/waouh-avatar-notes.ts (calculés côté serveur, affichés tels quels ici).
export type AvatarStepState = "done" | "current" | "todo";
export interface AvatarStep { key: string; label: string; state: AvatarStepState }

export interface AvatarSynthesis {
  offer: number | null;
  listPrice: number | null;
  gapPct: number | null;
  stance: "close" | "fair" | "ambitious" | "unknown";
  suggested: number | null;
  level: string;
  etaHours: number | null;
  nextFollowUpAt: string | null;
}

const STATES = new Set(["done", "current", "todo"]);

/** Lit `meta.avatar_progress` sans jamais planter sur une donnée inattendue. */
export function parseAvatarProgress(value: unknown): AvatarStep[] | null {
  if (!Array.isArray(value)) return null;
  const steps = value
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({ key: String(s.key ?? ""), label: String(s.label ?? "").trim(), state: String(s.state ?? "") as AvatarStepState }))
    .filter((s) => s.label && STATES.has(s.state));
  return steps.length >= 2 ? steps : null;
}

export function parseAvatarSynthesis(value: unknown): AvatarSynthesis | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const num = (x: unknown) => (x != null && Number.isFinite(Number(x)) ? Number(x) : null);
  const stance = ["close", "fair", "ambitious"].includes(String(v.stance)) ? (v.stance as AvatarSynthesis["stance"]) : "unknown";
  if (num(v.offer) == null) return null;
  return {
    offer: num(v.offer), listPrice: num(v.listPrice), gapPct: num(v.gapPct), stance, suggested: num(v.suggested),
    level: String(v.level ?? "C0"), etaHours: num(v.etaHours), nextFollowUpAt: typeof v.nextFollowUpAt === "string" ? v.nextFollowUpAt : null,
  };
}

export const STANCE_LABEL: Record<AvatarSynthesis["stance"], string> = {
  close: "Offre proche du prix affiché",
  fair: "Offre réaliste",
  ambitious: "Offre ambitieuse",
  unknown: "Offre enregistrée",
};

/** « demain » / « dans 5 h » / « bientôt » — sans dépendre du fuseau. */
export function followUpLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "bientôt";
  const ms = Date.parse(iso) - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "maintenant";
  const hours = Math.round(ms / 3600_000);
  if (hours < 1) return "dans moins d'1 h";
  if (hours < 24) return `dans ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "demain" : `dans ${days} jours`;
}

/** Part du prix affiché atteinte par l'offre (jauge 0–100), null si inconnue. */
export function offerGauge(synthesis: Pick<AvatarSynthesis, "offer" | "listPrice">): number | null {
  if (!synthesis.offer || !synthesis.listPrice || synthesis.listPrice <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((synthesis.offer / synthesis.listPrice) * 100)));
}
