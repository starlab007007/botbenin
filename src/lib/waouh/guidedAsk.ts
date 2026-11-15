// Recherche guidée → moteur du Chat.
//
// Les entrées guidées (Acheter, Vendre, Trouver, Opportunité, Service, Prestation, Demander)
// ne lancent plus un parcours à part : elles déposent une demande que le Chat envoie par son
// propre moteur. La recherche, les fiches, l'intérêt et l'ouverture de l'échange sont alors
// strictement ceux du Chat.

export type GuidedKind = "acheter" | "vendre" | "trouver" | "demander" | "opportunite" | "service" | "prestation";

export type GuidedAskInput = {
  kind: GuidedKind;
  q?: string;
  city?: string;
  budget?: string | number | null;
  /** Texte libre saisi dans l'accueil : envoyé tel quel, sans forcer la fenêtre de recherche. */
  free?: boolean;
};

export type GuidedAsk = {
  kind: GuidedKind;
  /** Phrase envoyée au Chat. Vide pour « Vendre » : le Chat ouvre alors sa fiche de vente. */
  text: string;
  goal: string;
  city: string;
  budget: number | null;
  /** Ouvre toujours la fenêtre de recherche du Chat, même si la phrase est courte. */
  force: boolean;
  ts: number;
};

export const GUIDED_ASK_EVENT = "waouh:guided-ask";
const KEY = "waouh_pending_guided_ask";
const MAX_AGE_MS = 2 * 60_000;

export const GUIDED_KIND_LABEL: Record<GuidedKind, string> = {
  acheter: "Achat",
  vendre: "Vente",
  trouver: "Recherche",
  demander: "Demande",
  opportunite: "Opportunité",
  service: "Service",
  prestation: "Prestation",
};

const ALREADY_PHRASED = /^\s*(je\s+(cherche|recherche|veux|voudrais|souhaite|vends)|j[’']ai\s+besoin|cherche|recherche|trouve|acheter|vendre)\b/i;

const LEAD: Record<Exclude<GuidedKind, "vendre">, (q: string) => string> = {
  acheter: (q) => `Je cherche à acheter ${q}`,
  trouver: (q) => `Je cherche ${q}`,
  demander: (q) => `Je recherche : ${q}`,
  opportunite: (q) => `Je cherche une opportunité : ${q}`,
  service: (q) => `Je cherche un service : ${q}`,
  prestation: (q) => `Je cherche un prestataire pour : ${q}`,
};

export function guidedBudget(value: GuidedAskInput["budget"]): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n).replace(/[\u202f\u00a0]/g, " ")} FCFA`;

/** Phrase naturelle comprise par le moteur du Chat, construite à partir du formulaire guidé. */
export function guidedAskText(input: GuidedAskInput): string {
  if (input.kind === "vendre") return "";
  const q = String(input.q ?? "").trim().replace(/\s+/g, " ");
  if (!q) return "";
  if (input.free) return q;
  const city = String(input.city ?? "").trim();
  const budget = guidedBudget(input.budget);
  let text = input.kind === "trouver" && ALREADY_PHRASED.test(q) ? q : LEAD[input.kind](q);
  if (city && !text.toLowerCase().includes(city.toLowerCase())) text += ` à ${city}`;
  if (budget && input.kind !== "opportunite") text += `, budget maximum ${fcfa(budget)}`;
  return text;
}

export function buildGuidedAsk(input: GuidedAskInput, now = Date.now()): GuidedAsk | null {
  const text = guidedAskText(input);
  if (input.kind !== "vendre" && !text) return null;
  return {
    kind: input.kind,
    text,
    goal: String(input.q ?? "").trim() || text,
    city: String(input.city ?? "").trim(),
    budget: guidedBudget(input.budget),
    force: input.kind !== "vendre" && !input.free,
    ts: now,
  };
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const safeStore = (): Store | null => {
  try { return typeof sessionStorage !== "undefined" ? sessionStorage : null; } catch { return null; }
};

/** Dépose la demande pour le Chat (monté ou sur le point de l'être) et le prévient. */
export function queueGuidedAsk(input: GuidedAskInput, store: Store | null = safeStore()): GuidedAsk | null {
  const ask = buildGuidedAsk(input);
  if (!ask) return null;
  try { store?.setItem(KEY, JSON.stringify(ask)); } catch { /* stockage indisponible : l'évènement suffit si le Chat est monté */ }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(GUIDED_ASK_EVENT, { detail: ask }));
  return ask;
}

/** Lit la demande en attente sans la retirer (une demande trop ancienne est ignorée). */
export function peekGuidedAsk(store: Store | null = safeStore(), now = Date.now()): GuidedAsk | null {
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return null;
    const ask = JSON.parse(raw) as GuidedAsk;
    if (!ask || typeof ask.ts !== "number" || now - ask.ts > MAX_AGE_MS || typeof ask.text !== "string") {
      store?.removeItem(KEY);
      return null;
    }
    return ask;
  } catch {
    return null;
  }
}

/** Retire la demande en attente : elle n'est envoyée qu'une fois. */
export function takeGuidedAsk(store: Store | null = safeStore(), now = Date.now()): GuidedAsk | null {
  const ask = peekGuidedAsk(store, now);
  if (ask) { try { store?.removeItem(KEY); } catch { /* déjà retirée */ } }
  return ask;
}

/** Écran du Chat qui reçoit la demande : espace Chat sur grand écran, conversation Bot sur téléphone. */
export function guidedChatPath(width: number = typeof window !== "undefined" ? window.innerWidth : 0): string {
  return Number.isFinite(width) && width >= 768 ? "/app/chat" : "/app/chat/waouh";
}

const NEXUS_KIND: Record<string, GuidedKind> = {
  acheter: "acheter", purchase: "acheter",
  trouver: "trouver", demander: "demander",
  opportunite: "opportunite", opportunity: "opportunite",
  service: "service",
  prestation: "prestation", project: "prestation",
};

/**
 * Ancien lien de recherche guidée (`/app/nexus?q=…&go=1`) → demande pour le Chat.
 * Retourne null quand le lien doit garder l'écran d'origine : vente d'un article déjà
 * publié, suivi d'une mission, outils avancés ou lien sans recherche à lancer.
 */
export function guidedAskFromSearchParams(params: URLSearchParams): GuidedAskInput | null {
  if (params.get("go") !== "1") return null;
  const q = (params.get("q") || "").trim();
  if (!q) return null;
  if (params.get("tab") || params.get("article_id") || params.get("sale_draft")) return null;
  const mode = params.get("mode");
  const rawKind = (params.get("kind") || "").toLowerCase();
  if (mode === "find_buyers" || mode === "sell" || rawKind === "vendre" || rawKind === "sale") return null;
  const kind = NEXUS_KIND[rawKind] ?? (mode === "find_sellers" ? "acheter" : "trouver");
  return { kind, q, city: params.get("city") || "", budget: params.get("budget") };
}
