// WAOUH — Catalogue unique des messages du parcours commerce (v3).
//
// Une seule source pour les textes envoyés sur le Web, Flutter et WhatsApp.
// Règles (docs « WAOUH Chat — Parcours unifié v3 », section Style) :
//   - un titre de 5 mots au plus ;
//   - une ligne de détail de 90 caractères au plus, avec un seul chiffre utile ;
//   - 1 à 3 boutons, meilleure action en premier ;
//   - pas d'emoji, pas de filet décoratif, pas de slogan, vouvoiement ;
//   - montants au format « 2 450 FCFA ».
//
// Le module est pur (aucun accès base) : testé par waouh-message-catalog-test.ts.

import { formatFcfaV3, type WaouhAction } from "./waouh-commands.ts";

export const fcfa = formatFcfaV3;

export type CatalogRole = "buyer" | "seller";

export type CatalogKey =
  | "deal_opened"
  | "deal_already_open"
  | "request_sent"
  | "new_buyer"
  | "question_prompt"
  | "question_sent"
  | "question_received"
  | "offer_sent"
  | "offer_received"
  | "awaiting_counterparty"
  | "counter_prompt"
  | "agreement"
  | "offer_refused_actor"
  | "offer_refused_other"
  | "seller_confirmed"
  | "pay_mode_chosen"
  | "courier_assigned"
  | "picked_up"
  | "delivered"
  | "payment_confirmed"
  | "deal_cancelled"
  | "no_open_deal"
  | "multiple_open_deals"
  | "stale_button"
  | "out_of_stage"
  | "technical_error"
  | "article_reserved"
  | "negotiation_paused"
  | "not_understood"
  | "confirm_money_action"
  | "self_article"
  | "results_found";

export interface CatalogVars {
  title?: string | null;
  amount?: number | null;
  previous?: number | null;
  price?: number | null;
  suggested?: number | null;
  role?: CatalogRole | null;
  etaMinutes?: number | null;
  responseMinutes?: number | null;
  method?: "cash" | "mobile_money" | null;
  reason?: string | null;
  count?: number | null;
  label?: string | null;
  question?: string | null;
}

export interface CatalogMessage {
  key: CatalogKey;
  title: string;
  detail: string;
  /** Texte prêt à envoyer : « *Titre* » + retour ligne + détail. */
  text: string;
}

export const TITLE_MAX_WORDS = 5;
export const DETAIL_MAX_CHARS = 90;

const other = (role: CatalogRole | null | undefined) => (role === "seller" ? "l'acheteur" : "le vendeur");
const Other = (role: CatalogRole | null | undefined) => (role === "seller" ? "L'acheteur" : "Le vendeur");

/** Titre court d'un article, pour tenir dans la ligne de détail. */
export function shortTitle(title: string | null | undefined, max = 32): string {
  const clean = String(title || "").replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
  if (!clean) return "l'article";
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function responseHint(minutes: number | null | undefined): string {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return "";
  if (minutes < 60) return ` Réponse en général en ${Math.round(minutes)} min.`;
  const hours = Math.round(minutes / 60);
  return ` Réponse en général en ${hours} h.`;
}

type Builder = (v: CatalogVars) => { title: string; detail: string };

const BUILDERS: Record<CatalogKey, Builder> = {
  deal_opened: (v) => ({
    title: "Offre envoyée",
    detail: `${shortTitle(v.title)} · ${fcfa(v.amount ?? v.price)}.${responseHint(v.responseMinutes) || " Le vendeur est prévenu."}`,
  }),
  deal_already_open: (v) => ({
    title: "Discussion déjà ouverte",
    detail: `${shortTitle(v.title)} · offre en cours ${fcfa(v.amount ?? v.price)}.`,
  }),
  request_sent: (v) => ({
    title: "Demande envoyée",
    detail: `${shortTitle(v.title)} · prix du vendeur ${fcfa(v.amount ?? v.price)}. À vous de décider.`,
  }),
  new_buyer: (v) => ({
    title: "Nouvel acheteur",
    detail: `${shortTitle(v.title)} · offre ${fcfa(v.amount)}${v.price && v.price !== v.amount ? ` (affiché ${fcfa(v.price)})` : ""}.`,
  }),
  question_prompt: (v) => ({
    title: "Votre question",
    detail: `Écrivez-la ici, ${other(v.role ?? "buyer")} la reçoit directement.`,
  }),
  question_sent: (v) => ({
    title: "Question envoyée",
    detail: `${Other(v.role)} vous répondra ici.`,
  }),
  question_received: (v) => ({
    title: "Nouvelle question",
    detail: `${shortTitle(v.question, 70)}`,
  }),
  offer_sent: (v) => ({
    title: "Offre envoyée",
    detail: `${fcfa(v.amount)} pour ${shortTitle(v.title)}.${responseHint(v.responseMinutes) || ` En attente ${v.role === "seller" ? "de l'acheteur" : "du vendeur"}.`}`,
  }),
  offer_received: (v) => ({
    title: "Nouvelle offre",
    detail: `${fcfa(v.amount)} pour ${shortTitle(v.title, 28)}${v.previous ? ` (avant ${fcfa(v.previous)})` : ""}.`,
  }),
  awaiting_counterparty: (v) => ({
    title: "En attente de réponse",
    detail: `Votre offre de ${fcfa(v.amount)} attend ${other(v.role)}.${responseHint(v.responseMinutes)}`,
  }),
  counter_prompt: (v) => ({
    title: "Votre prix ?",
    detail: v.suggested ? `Indiquez un montant. Suggestion : ${fcfa(v.suggested)}.` : "Indiquez un montant en FCFA.",
  }),
  agreement: (v) => ({
    title: "Accord conclu",
    detail: v.role === "seller"
      ? `${fcfa(v.amount)}. Confirmez que l'article est disponible.`
      : `${fcfa(v.amount)}. Choisissez votre paiement à la livraison.`,
  }),
  offer_refused_actor: () => ({
    title: "Négociation terminée",
    detail: "Vous avez refusé l'offre.",
  }),
  offer_refused_other: (v) => ({
    title: "Offre refusée",
    detail: `${Other(v.role)} a refusé. Négociation terminée.`,
  }),
  seller_confirmed: () => ({
    title: "Article confirmé",
    detail: "Le vendeur confirme. Préparation de la livraison.",
  }),
  pay_mode_chosen: (v) => ({
    title: "Paiement choisi",
    detail: `${v.method === "cash" ? "Cash" : "Mobile Money"} à la livraison.`,
  }),
  courier_assigned: (v) => ({
    title: "Livreur en route",
    detail: v.etaMinutes ? `Arrivée estimée dans ${Math.round(v.etaMinutes)} min.` : "Un livreur WAOUH prend en charge l'article.",
  }),
  picked_up: () => ({
    title: "Colis récupéré",
    detail: "Le livreur a l'article et part en livraison.",
  }),
  delivered: (v) => ({
    title: "Article livré",
    detail: v.amount ? `Confirmez le paiement de ${fcfa(v.amount)}.` : "Confirmez le paiement.",
  }),
  payment_confirmed: (v) => ({
    title: "Vente terminée",
    detail: v.amount ? `Paiement de ${fcfa(v.amount)} confirmé. Merci.` : "Paiement confirmé. Merci.",
  }),
  deal_cancelled: () => ({
    title: "Commande annulée",
    detail: "La commande est annulée. Aucune autre action n'est requise.",
  }),
  no_open_deal: () => ({
    title: "Aucune discussion ouverte",
    detail: "Cherchez un produit puis touchez « Je le veux ».",
  }),
  multiple_open_deals: () => ({
    title: "Précisez l'article",
    detail: "Plusieurs discussions sont ouvertes. Répondez depuis le bon produit.",
  }),
  stale_button: () => ({
    title: "Offre plus active",
    detail: "Cette offre a été remplacée. Voici l'offre actuelle.",
  }),
  out_of_stage: (v) => ({
    title: "Action indisponible",
    detail: shortTitle(v.reason || "Cette action n'est pas possible à cette étape.", DETAIL_MAX_CHARS),
  }),
  technical_error: () => ({
    title: "Rien n'a été validé",
    detail: "Un incident technique est survenu. Réessayez dans un instant.",
  }),
  article_reserved: () => ({
    title: "Article déjà réservé",
    detail: "Un autre acheteur l'a obtenu. Voici des articles proches.",
  }),
  negotiation_paused: (v) => ({
    title: "Discussion en pause",
    detail: shortTitle(v.reason || "La négociation est suspendue temporairement.", DETAIL_MAX_CHARS),
  }),
  not_understood: () => ({
    title: "Je n'ai pas compris",
    detail: "Choisissez une action ci-dessous ou écrivez un montant.",
  }),
  confirm_money_action: (v) => ({
    title: "Confirmez-vous ?",
    detail: `${shortTitle(v.label || "Action", 40)}${v.amount ? ` · ${fcfa(v.amount)}` : ""}.`,
  }),
  self_article: () => ({
    title: "Votre propre article",
    detail: "Vous ne pouvez pas acheter votre propre annonce.",
  }),
  results_found: (v) => ({
    title: `${v.count ?? 0} article${(v.count ?? 0) > 1 ? "s" : ""} trouvé${(v.count ?? 0) > 1 ? "s" : ""}`,
    detail: "Touchez « Je le veux » ou proposez votre prix.",
  }),
};

/** Construit le message du catalogue. Le détail est tronqué à 90 caractères. */
export function renderCatalog(key: CatalogKey, vars: CatalogVars = {}): CatalogMessage {
  const built = BUILDERS[key](vars);
  const detail = built.detail.length > DETAIL_MAX_CHARS
    ? `${built.detail.slice(0, DETAIL_MAX_CHARS - 1).trimEnd()}…`
    : built.detail;
  return { key, title: built.title, detail, text: `*${built.title}*\n${detail}` };
}

/** Limite commune à tous les canaux : 3 boutons, libellés non vides, ids uniques. */
export function clampActions(actions: WaouhAction[] | null | undefined, max = 3): WaouhAction[] {
  const seen = new Set<string>();
  const out: WaouhAction[] = [];
  for (const action of actions || []) {
    if (!action?.id || !action?.label || seen.has(action.id)) continue;
    seen.add(action.id);
    out.push(action);
    if (out.length >= max) break;
  }
  return out;
}

/** Libellé d'étape pour la barre de progression (7 étapes). */
export const JOURNEY_STEPS = [
  { key: "interest", label: "Intérêt" },
  { key: "negotiation", label: "Négociation" },
  { key: "agreement", label: "Accord" },
  { key: "preparation", label: "Préparation" },
  { key: "courier", label: "Livreur" },
  { key: "delivery", label: "Livraison" },
  { key: "payment", label: "Paiement" },
] as const;

export type JourneyStepKey = typeof JOURNEY_STEPS[number]["key"];

/** Étape du parcours à partir des états stockés (négociation et deal). */
export function stageFor(input: {
  negotiationState?: string | null;
  dealStatus?: string | null;
  interestOnly?: boolean;
}): JourneyStepKey {
  const deal = String(input.dealStatus || "");
  if (deal === "completed") return "payment";
  if (deal === "delivered") return "delivery";
  if (deal === "assigned" || deal === "picked_up") return "courier";
  if (deal === "pending_assignment") return "preparation";
  if (deal === "awaiting_confirmation") return "agreement";
  const neg = String(input.negotiationState || "");
  if (neg === "accepted") return "agreement";
  if (neg === "proposed" || neg === "countered") return "negotiation";
  return "interest";
}
