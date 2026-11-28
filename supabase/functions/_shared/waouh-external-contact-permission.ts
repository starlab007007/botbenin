type WhatsAppContact = {
  channel?: string | null;
  consent_state?: string | null;
  contactability_level?: string | null;
};

/**
 * Pourquoi WAOUH écrit à ce contact.
 * - offer_request : répondre à l'offre ou à l'annonce que ce contact a lui-même publiée
 *   (achat, devis de service, prestation, candidature). Autorisé pour un contact qui a donné
 *   son accord, un professionnel public ou un contact qui a déjà écrit le premier.
 * - prospection : démarcher (vente vers des acheteurs, campagnes). Accord explicite uniquement.
 * Un numéro simplement publié dans une annonce de particulier ne vaut pas accord.
 */
export type ContactPurpose = "offer_request" | "prospection";

const PROSPECTION_CONSENT = new Set(["opt_in", "partner_contract"]);
const REQUEST_CONSENT = new Set(["opt_in", "partner_contract", "public_business", "initiated"]);
/** Base d'un interlocuteur de salle (voir resolveRoomContact) acceptée pour un premier message. */
const ROOM_REQUEST_BASES = new Set(["partner", "listing_owner", "public_business", "initiated"]);
const ROOM_PROSPECTION_BASES = new Set(["partner", "listing_owner"]);

export function contactPurposeFor(mode: string | null | undefined): ContactPurpose {
  return mode === "sell" ? "prospection" : "offer_request";
}

export function purposeFromPayload(value: unknown): ContactPurpose {
  return value === "offer_request" ? "offer_request" : "prospection";
}

/** L'état de consentement d'un contact autorise-t-il un premier message pour cet objet ? */
export function consentAllows(state: string | null | undefined, purpose: ContactPurpose = "prospection"): boolean {
  return (purpose === "offer_request" ? REQUEST_CONSENT : PROSPECTION_CONSENT).has(String(state ?? ""));
}

/** Permission for a first external WAOUH message, separate from reachability. Strict by default. */
export function permitsExternalWhatsApp(contact: WhatsAppContact | null | undefined, purpose: ContactPurpose = "prospection"): boolean {
  if (contact?.channel !== "whatsapp" || !consentAllows(contact.consent_state, purpose)) return false;
  const levels = purpose === "offer_request" ? ["C1", "C2", "C3", "C4", "C5"] : ["C3", "C4", "C5"];
  return levels.includes(contact.contactability_level ?? "");
}

/** Premier message d'une salle vers un interlocuteur hors WAOUH. */
export function roomGuestBasisAllowed(basis: string | null | undefined, purpose: ContactPurpose): boolean {
  return (purpose === "offer_request" ? ROOM_REQUEST_BASES : ROOM_PROSPECTION_BASES).has(String(basis ?? ""));
}
