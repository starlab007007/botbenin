import {productPhotos} from '../../../supabase/functions/_shared/waouh-product-presentation';
import { maskPhone } from "./liveReasoning";

const isUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v.trim());

/** Photos du produit (http/https uniquement), dédoublonnées. */
type Loose = { public_facts?: Record<string, unknown> | null; evidence?: Record<string, unknown> | null; contact_pack?: unknown };

export function resultPhotos(result: Loose): string[] {
  return productPhotos({ ...result, evidence: { ...result.public_facts, ...result.evidence } });
}

export function resultAttribution(result: Loose & { source_key?: string }): string | null {
  if (result.source_key === "benin_open_places") return "© OpenStreetMap contributors · ODbL";
  const facts = { ...result.public_facts, ...result.evidence };
  const credit = resultPhotos(result).length && typeof facts.photo_attribution === "string"
    ? facts.photo_attribution : facts.source_attribution;
  return typeof credit === "string" ? credit.trim() || null : null;
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
