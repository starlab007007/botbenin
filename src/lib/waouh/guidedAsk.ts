// Recherche guidée → moteur du Chat.
//
// Les entrées guidées (Acheter, Vendre, Trouver, Opportunité, Service, Prestation, Demander)
// ne lancent plus un parcours à part : elles déposent une demande que le Chat envoie par son
// propre moteur. La recherche, les fiches, l'intérêt et l'ouverture de l'échange sont alors
// strictement ceux du Chat.

import { buildWaouhAuthRedirect } from "@/lib/waouhAccessPolicy";

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

/** Salutation, question ou phrase de conversation : à envoyer telle quelle, ce n'est pas un besoin à chercher. */
const CONVERSATION = /^\s*(bonjour|bonsoir|salut|hello|coucou|merci|ok|oui|non|comment|pourquoi|quand|combien|qui|que|quels?|quelles?|quoi|est-ce|aide|aidez|explique|résume|resume|où|ou en)(?=[\s,.!?'’-]|$)|\?/i;

/**
 * Texte libre : un besoin court (« riz parfumé », « iPhone 13 à Cotonou ») est une recherche,
 * même sans verbe ; une phrase de conversation reste un simple message.
 */
export function freeTextIsNeed(q: string): boolean {
  const t = q.trim();
  if (t.length < 3 || CONVERSATION.test(t) || ALREADY_PHRASED.test(t)) return false;
  return t.split(/\s+/).length <= 8;
}

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
  if (input.free) return freeTextIsNeed(q) ? LEAD.trouver(q) : q;
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
    force: input.kind !== "vendre" && (!input.free || freeTextIsNeed(String(input.q ?? ""))),
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
  acheter: "acheter", purchase: "acheter", buy: "acheter",
  vendre: "vendre", sale: "vendre", sell: "vendre",
  trouver: "trouver", demander: "demander", ask: "demander",
  opportunite: "opportunite", opportunity: "opportunite",
  service: "service",
  prestation: "prestation", project: "prestation",
};

/** Type de demande déduit d'un ancien lien ou d'un nom de parcours (`acheter`, `vendre`, `demander`…). */
export function guidedKindFrom(kind: string | null | undefined, mode?: string | null): GuidedKind {
  const key = String(kind || "").toLowerCase();
  if (NEXUS_KIND[key]) return NEXUS_KIND[key];
  if (mode === "find_buyers" || mode === "sell") return "vendre";
  if (mode === "find_sellers") return "acheter";
  return "trouver";
}

/**
 * Ancien lien de recherche guidée (`/app/nexus?…`) → demande pour le Chat.
 * Retourne null quand il n'y a rien à lancer : le Chat s'ouvre simplement.
 */
export function guidedAskFromSearchParams(params: URLSearchParams): GuidedAskInput | null {
  const kind = guidedKindFrom(params.get("kind"), params.get("mode"));
  if (kind === "vendre" || params.get("article_id") || params.get("sale_draft")) return { kind: "vendre" };
  const q = (params.get("q") || "").trim();
  if (!q) return null;
  return { kind, q, city: params.get("city") || "", budget: params.get("budget") };
}

type Nav = (path: string, opts?: { replace?: boolean }) => void;

/**
 * Point d'entrée unique des parcours guidés : la demande est déposée pour le Chat, puis le Chat
 * s'ouvre (un visiteur passe d'abord par la connexion et revient au Chat). Aucun autre écran.
 */
export function openGuidedChat(navigate: Nav, input: GuidedAskInput | null, loggedIn: boolean, opts: { replace?: boolean } = {}): void {
  if (input) queueGuidedAsk(input);
  const chat = guidedChatPath();
  navigate(loggedIn || !input ? chat : buildWaouhAuthRedirect(chat, "/app/auth"), opts);
}
