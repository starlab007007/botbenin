import { maskPhone } from "./liveReasoning";

const isUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v.trim());

/** Photos du produit (http/https uniquement), dédoublonnées. */
type Loose = { evidence?: Record<string, unknown> | null; contact_pack?: unknown };

export function resultPhotos(result: Loose): string[] {
  const e = (result.evidence ?? {}) as Record<string, unknown>;
  const list: unknown[] = [e.primary_photo_url, e.image_url, ...(Array.isArray(e.photos) ? e.photos : [])];
  return Array.from(new Set(list.filter(isUrl).map((u) => u.trim()))).slice(0, 6);
}

/** Contact masqué : seuls les 4 derniers chiffres sont affichés. */
export function resultContact(result: Loose): { phone: string | null; channel: string | null } {
  const e = (result.evidence ?? {}) as Record<string, unknown>;
  const pack = (result.contact_pack ?? {}) as { masked_contacts?: Array<{ channel?: string; last4?: string | null }>; available_channels?: Array<{ channel?: string; last4?: string | null }> };
  const channelEntry = pack.masked_contacts?.find((c) => c?.last4) ?? pack.available_channels?.find((c) => c?.last4);
  const raw = channelEntry?.last4 ?? e.contact_last4 ?? e.contact_phone_last4;
  const phone = maskPhone(typeof raw === "string" || typeof raw === "number" ? String(raw) : null);
  const channel = channelEntry?.channel ?? (e.has_whatsapp ? "whatsapp" : null);
  return { phone, channel };
}

export const channelLabel = (c: string | null) => (c === "whatsapp" ? "WhatsApp" : c === "email" ? "Email" : c === "phone" || c === "call" ? "Appel" : c === "waouh" ? "WAOUH" : c ? "Contact" : "");
