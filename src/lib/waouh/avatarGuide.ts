// WAOUH — L'avatar guide (Web) : points réguliers, accueil à l'ouverture, réglages.
// Parité serveur : supabase/functions/_shared/waouh-avatar-briefing.ts (le texte est composé côté serveur, jamais ici).
import { supabase } from "@/integrations/supabase/client";

export type AvatarCadence = "off" | "hourly" | "every_4h" | "daily" | "weekly";

export interface AvatarPrefs {
  welcome: boolean;
  cadence: AvatarCadence;
  quiet_start: number;
  quiet_end: number;
  /** WhatsApp : évènements d'une offre (relance possible, voie ouverte, clôture). Actif par défaut. */
  notify_events: boolean;
  /** WhatsApp : bilans réguliers. Désactivé par défaut (le bilan reste dans le chat). */
  notify_digest: boolean;
  last_briefing_at: string | null;
  next_briefing_at: string | null;
}

export interface BriefingItem { label: string; detail: string; tone: "ok" | "warn" | "info" }
export interface BriefingSection { key: string; title: string; items: BriefingItem[] }
export interface BriefingAction {
  id: string;
  label: string;
  article_id?: string | null;
  thread_id?: string | null;
  negotiation_id?: string | null;
  role?: "buyer" | "seller";
  title?: string;
}
export interface AvatarBriefing {
  kind: "first" | "welcome" | "point" | "digest";
  greeting: string;
  sentences: string[];
  sections: BriefingSection[];
  actions: BriefingAction[];
  tip: string;
  generatedAt: string;
}

export const CADENCE_OPTIONS: Array<{ value: AvatarCadence; label: string; hint: string }> = [
  { value: "off", label: "Jamais", hint: "Je ne fais le point que si vous me le demandez." },
  { value: "hourly", label: "Toutes les heures", hint: "Un point court, seulement s'il y a du nouveau." },
  { value: "every_4h", label: "Toutes les 4 heures", hint: "Un rythme calme pour suivre vos offres." },
  { value: "daily", label: "Chaque jour", hint: "Un point par jour, hors heures calmes." },
  { value: "weekly", label: "Chaque semaine", hint: "Un bilan hebdomadaire de mes activités." },
];

const CADENCES = new Set<string>(CADENCE_OPTIONS.map((o) => o.value));
const TONES = new Set(["ok", "warn", "info"]);

/** Lecture défensive de `meta.avatar_briefing` : donnée inattendue → null, jamais d'exception dans le fil. */
export function parseAvatarBriefing(value: unknown): AvatarBriefing | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const sentences = Array.isArray(v.sentences) ? v.sentences.map((s) => String(s ?? "").trim()).filter(Boolean).slice(0, 3) : [];
  if (sentences.length < 2) return null;
  const sections: BriefingSection[] = (Array.isArray(v.sections) ? v.sections : [])
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({
      key: String(s.key ?? ""),
      title: String(s.title ?? "").trim(),
      items: (Array.isArray(s.items) ? s.items : [])
        .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
        .map((i) => ({ label: String(i.label ?? "").trim(), detail: String(i.detail ?? "").trim(), tone: (TONES.has(String(i.tone)) ? i.tone : "info") as BriefingItem["tone"] }))
        .filter((i) => i.label)
        .slice(0, 3),
    }))
    .filter((s) => s.title && s.items.length)
    .slice(0, 4);
  const actions: BriefingAction[] = (Array.isArray(v.actions) ? v.actions : [])
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object" && !!String((a as Record<string, unknown>).id ?? "").trim())
    .map((a) => ({
      id: String(a.id).trim(), label: String(a.label ?? a.id).trim(),
      article_id: (a.article_id as string | null | undefined) ?? null, thread_id: (a.thread_id as string | null | undefined) ?? null,
      negotiation_id: (a.negotiation_id as string | null | undefined) ?? null,
      role: a.role === "seller" ? ("seller" as const) : ("buyer" as const),
      title: typeof a.title === "string" ? a.title : undefined,
    }))
    .slice(0, 3);
  const kind = ["first", "welcome", "point", "digest"].includes(String(v.kind)) ? (v.kind as AvatarBriefing["kind"]) : "point";
  return {
    kind, greeting: String(v.greeting ?? sentences[0]), sentences, sections, actions,
    tip: String(v.tip ?? ""), generatedAt: typeof v.generatedAt === "string" ? v.generatedAt : new Date().toISOString(),
  };
}

export function parseAvatarPrefs(value: unknown): AvatarPrefs | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const hour = (x: unknown, d: number) => (Number.isInteger(x) && Number(x) >= 0 && Number(x) <= 23 ? Number(x) : d);
  return {
    welcome: typeof v.welcome === "boolean" ? v.welcome : true,
    cadence: CADENCES.has(String(v.cadence)) ? (v.cadence as AvatarCadence) : "daily",
    quiet_start: hour(v.quiet_start, 21), quiet_end: hour(v.quiet_end, 7),
    notify_events: typeof v.notify_events === "boolean" ? v.notify_events : true,
    notify_digest: typeof v.notify_digest === "boolean" ? v.notify_digest : false,
    last_briefing_at: typeof v.last_briefing_at === "string" ? v.last_briefing_at : null,
    next_briefing_at: typeof v.next_briefing_at === "string" ? v.next_briefing_at : null,
  };
}

/** « dans 3 h » / « demain » / « aucun » — libellé du prochain point. */
export function nextPointLabel(iso: string | null, cadence: AvatarCadence, now: Date = new Date()): string {
  if (cadence === "off") return "Points réguliers désactivés";
  if (!iso) return "Prochain point bientôt";
  const ms = Date.parse(iso) - now.getTime();
  if (!Number.isFinite(ms) || ms <= 60_000) return "Prochain point imminent";
  const hours = Math.round(ms / 3600_000);
  if (hours < 1) return "Prochain point dans moins d'1 h";
  if (hours < 24) return `Prochain point dans ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Prochain point demain" : `Prochain point dans ${days} jours`;
}

export const hourLabel = (h: number) => `${String(h).padStart(2, "0")} h`;

// ---------------------------------------------------------------------------
// Appels serveur (jeton de l'utilisateur ; jamais d'identifiant dans le corps)
// ---------------------------------------------------------------------------
export interface BriefingResult {
  sent: boolean;
  reason: string;
  briefing: AvatarBriefing | null;
  message: AvatarChatRow | null;
  /** Toutes les bulles du point (2 à 3), dans l'ordre d'affichage. */
  messages: AvatarChatRow[];
  prefs: AvatarPrefs | null;
}

export type AvatarChatRow = { id: string; direction: "in" | "out"; text: string; meta: Record<string, unknown>; created_at: string };

const isRow = (m: unknown): m is AvatarChatRow => !!m && typeof m === "object" && typeof (m as AvatarChatRow).id === "string" && typeof (m as AvatarChatRow).text === "string";

/** Bulle de l'avatar dans le chat : { seq, of } ; null pour tout autre message. */
export function avatarBubbleInfo(meta: unknown): { seq: number; of: number } | null {
  const m = meta && typeof meta === "object" ? (meta as Record<string, any>) : null;
  if (!m || m.intent !== "avatar_briefing") return null;
  const b = m.avatar_bubble;
  if (!b || typeof b !== "object") return null;
  const seq = Number(b.seq), of = Number(b.of);
  return Number.isInteger(seq) && Number.isInteger(of) && seq >= 0 && of >= 1 && seq < of ? { seq, of } : null;
}

/** Fenêtre « en direct » : au-delà, la bulle est de l'historique et s'affiche d'un coup. */
export const AVATAR_LIVE_WINDOW_MS = 15_000;

/**
 * Délai avant d'afficher une bulle : l'avatar « écrit » (700 ms, puis 1,1 s de plus par bulle suivante).
 * Historique (message ancien) ou message ordinaire : aucun délai. Ne dépend que du message reçu : sans état partagé.
 */
export function avatarRevealDelayMs(meta: unknown, createdAtMs: number, nowMs: number): number {
  const info = avatarBubbleInfo(meta);
  if (!info) return 0;
  if (!Number.isFinite(createdAtMs) || nowMs - createdAtMs > AVATAR_LIVE_WINDOW_MS) return 0;
  return 700 + info.seq * 1100;
}

async function call(body: Record<string, unknown>): Promise<Record<string, any> | null> {
  try {
    const { data, error } = await supabase.functions.invoke("waouh-avatar-briefing", { body });
    if (error || !data?.ok) return null;
    return data as Record<string, any>;
  } catch {
    return null;
  }
}

export async function openAvatarBriefing(action: "open" | "now", sessionId: string | null): Promise<BriefingResult | null> {
  const data = await call({ action, session_id: sessionId });
  if (!data) return null;
  return {
    sent: data.sent === true,
    reason: String(data.reason ?? ""),
    briefing: parseAvatarBriefing(data.briefing),
    message: isRow(data.message) ? data.message : null,
    messages: Array.isArray(data.messages) ? data.messages.filter(isRow) : isRow(data.message) ? [data.message] : [],
    prefs: parseAvatarPrefs(data.prefs),
  };
}

export async function fetchAvatarPrefs(): Promise<AvatarPrefs | null> {
  const data = await call({ action: "get_prefs" });
  return data ? parseAvatarPrefs(data.prefs) : null;
}

export async function saveAvatarPrefs(patch: Partial<Pick<AvatarPrefs, "welcome" | "cadence" | "quiet_start" | "quiet_end" | "notify_events" | "notify_digest">>): Promise<AvatarPrefs | null> {
  const data = await call({ action: "set_prefs", prefs: patch });
  return data ? parseAvatarPrefs(data.prefs) : null;
}

/** Une seule ouverture automatique par fenêtre de 30 min et par navigateur (plusieurs instances du chat, rechargements). */
const OPEN_KEY = "waouh_avatar_open_at";
export function shouldAutoOpenNow(now: number = Date.now(), storage: Pick<Storage, "getItem" | "setItem"> | null = safeStorage()): boolean {
  try {
    const last = Number(storage?.getItem(OPEN_KEY) ?? 0);
    if (Number.isFinite(last) && now - last < 30 * 60_000) return false;
    storage?.setItem(OPEN_KEY, String(now));
  } catch { /* stockage indisponible : on laisse le serveur limiter */ }
  return true;
}
function safeStorage(): Storage | null {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
}
