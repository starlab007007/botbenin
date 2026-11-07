import { prepareNexusContact, type NexusDiscoveryResult } from "@/lib/waouh/nexus";

/** Canaux par lesquels une offre peut être jointe. L'ordre est l'ordre de préférence. */
export type OfferChannel = "waouh" | "whatsapp" | "email" | "phone";

type Loose = Pick<NexusDiscoveryResult, "fabric_id"> & {
  source_key?: string | null;
  evidence?: Record<string, unknown> | null;
  contact_pack?: unknown;
  contact_policy?: { can_auto_contact?: boolean } | null;
};

const ORDER: OfferChannel[] = ["waouh", "whatsapp", "email", "phone"];

function normalize(channel: unknown): OfferChannel | null {
  const c = String(channel || "").toLowerCase();
  if (c === "waouh" || c === "app" || c === "waouh_app") return "waouh";
  if (c === "whatsapp" || c === "wa") return "whatsapp";
  if (c === "email" || c === "mail") return "email";
  if (c === "phone" || c === "call" || c === "sms") return "phone";
  return null;
}

/** Tous les moyens de joindre le propriétaire d'une offre (application WAOUH, WhatsApp, e-mail, téléphone). */
export function offerChannels(result: Loose): OfferChannel[] {
  const found = new Set<OfferChannel>();
  const id = result.fabric_id || "";
  const evidence = (result.evidence || {}) as Record<string, unknown>;
  if (id.startsWith("article:")) found.add("waouh");
  if (id.startsWith("catalog:") && (evidence.source === "partner" || evidence.has_contact === true || evidence.has_contact === "true")) found.add("waouh");
  const pack = (result.contact_pack || {}) as { available_channels?: Array<{ channel?: string }>; masked_contacts?: Array<{ channel?: string }> };
  for (const entry of [...(pack.available_channels ?? []), ...(pack.masked_contacts ?? [])]) {
    const channel = normalize(entry?.channel);
    if (channel) found.add(channel);
  }
  if (evidence.has_whatsapp === true || evidence.has_whatsapp === "true") found.add("whatsapp");
  const hints = (evidence.contact_hints || {}) as Record<string, unknown>;
  if (Number(hints.email_count) > 0) found.add("email");
  if (Number(hints.phone_count) > 0) found.add("phone");
  return ORDER.filter((c) => found.has(c));
}

/** Canaux directs : ceux que l'utilisateur peut ouvrir lui-même (hors application WAOUH). */
export const directChannels = (result: Loose): OfferChannel[] => offerChannels(result).filter((c) => c !== "waouh");

export const hasContact = (result: Loose): boolean => offerChannels(result).length > 0;

export const channelName = (channel: OfferChannel): string => (channel === "waouh" ? "WAOUH" : channel === "whatsapp" ? "WhatsApp" : channel === "email" ? "E-mail" : "Appel");

/** Premier message proposé à l'utilisateur pour un contact direct. */
export function directMessage(title: string, price?: number | null): string {
  const about = title ? `« ${title} »` : "votre annonce";
  return `Bonjour, je vous contacte via WAOUH au sujet de ${about}${price && price > 0 ? ` (${Math.round(price).toLocaleString("fr-FR")} FCFA)` : ""}. Est-ce toujours disponible ? Quel est votre meilleur prix ?`;
}

export type DirectContactOutcome = "opened" | "masked";

/**
 * Ouvre WhatsApp, la messagerie ou l'appel, avec le message déjà rédigé.
 * Le contact n'est révélé que si la règle de la source l'autorise ; sinon on renvoie « masked »
 * et l'écran propose de confier la prise de contact à Bot.
 */
export async function openDirectContact(result: Loose & { subject?: string | null }, channel: Exclude<OfferChannel, "waouh">, message: string): Promise<DirectContactOutcome> {
  const prepared = await prepareNexusContact(result.fabric_id);
  const contact = prepared.contacts.find((c) => normalize(c.channel) === channel && String(c.value || "").trim());
  if (!prepared.contact_policy.can_reveal || !contact) return "masked";
  const value = String(contact.value).trim();
  if (channel === "email") {
    const subject = `À propos de ${result.subject || "votre annonce"}`;
    window.location.href = `mailto:${value}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  } else {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "masked";
    if (channel === "whatsapp") window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    else window.location.href = `tel:+${digits}`;
  }
  return "opened";
}
