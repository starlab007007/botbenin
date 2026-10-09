/**
 * Registre de contacts de l'Avatar : une seule source de vérité pour répondre à
 * « qui a été contacté, qui attend, qui a répondu, qui reste à contacter, et
 * quelles recherches tournent encore ». Construit uniquement à partir des
 * démarches (journeys) et missions réelles ; les numéros sont toujours masqués
 * (seuls les 4 derniers chiffres sont lus).
 */
import type { NexusAvatarMandate, NexusOpportunityJourney } from "./nexus";
import { maskPhone } from "./liveReasoning";

export type ContactBucket = "to_contact" | "pending" | "replied" | "agreed" | "done" | "cancelled";

export const BUCKET_LABEL: Record<ContactBucket, string> = {
  to_contact: "À contacter",
  pending: "En attente",
  replied: "A répondu",
  agreed: "Accord",
  done: "Terminé",
  cancelled: "Abandonné",
};

export function bucketOf(stage: NexusOpportunityJourney["stage"] | string | undefined): ContactBucket {
  switch (stage) {
    case "contacting":
    case "waiting_reply":
      return "pending";
    case "negotiating":
      return "replied";
    case "agreed":
    case "executing":
      return "agreed";
    case "completed":
      return "done";
    case "cancelled":
      return "cancelled";
    default:
      return "to_contact"; // discovered, enriching, contact_ready
  }
}

export type LedgerRow = {
  id: string;
  title: string;
  bucket: ContactBucket;
  city?: string | null;
  phone: string | null;
  channel: string | null;
  progress: number;
};

export type MissionProgress = {
  id: string;
  goal: string;
  contacted: number;
  max: number;
  replied: number;
  nextRunAt: string | null;
};

export type ContactLedger = {
  total: number;
  contacted: number;
  pending: number;
  replied: number;
  toContact: number;
  withNumber: number;
  rows: LedgerRow[];
  missions: MissionProgress[];
};

/** Premier numéro masqué connu pour une démarche (jamais le numéro complet). */
export function journeyPhone(journey: Pick<NexusOpportunityJourney, "masked_contact" | "contact_pack">): { phone: string | null; channel: string | null } {
  const masked = (journey.masked_contact ?? {}) as { phones?: Array<{ last4?: string | null; channel?: string | null }> };
  const fromMasked = Array.isArray(masked.phones) ? masked.phones.find((p) => maskPhone(p?.last4)) : undefined;
  if (fromMasked) return { phone: maskPhone(fromMasked.last4), channel: fromMasked.channel ?? null };
  const pack = (journey.contact_pack ?? {}) as { masked_contacts?: Array<{ last4?: string | null; channel?: string | null }> };
  const fromPack = Array.isArray(pack.masked_contacts) ? pack.masked_contacts.find((p) => maskPhone(p?.last4)) : undefined;
  return fromPack ? { phone: maskPhone(fromPack.last4), channel: fromPack.channel ?? null } : { phone: null, channel: null };
}

export function buildLedger(
  journeys: NexusOpportunityJourney[],
  mandates: Array<Pick<NexusAvatarMandate, "id" | "goal" | "status" | "contacted_count" | "max_contacts" | "replied_count" | "next_run_at">>,
): ContactLedger {
  const rows: LedgerRow[] = journeys.map((journey) => {
    const { phone, channel } = journeyPhone(journey);
    return {
      id: journey.id,
      title: journey.subject || "Opportunité",
      bucket: bucketOf(journey.stage),
      phone,
      channel: channel ?? journey.contact_channel ?? null,
      progress: journey.progress ?? 0,
    };
  });
  const count = (...buckets: ContactBucket[]) => rows.filter((r) => buckets.includes(r.bucket)).length;
  return {
    total: rows.length,
    contacted: count("pending", "replied", "agreed", "done"),
    pending: count("pending"),
    replied: count("replied", "agreed", "done"),
    toContact: count("to_contact"),
    withNumber: rows.filter((r) => !!r.phone).length,
    rows,
    missions: mandates
      .filter((m) => m.status === "active")
      .map((m) => ({
        id: m.id,
        goal: m.goal,
        contacted: m.contacted_count ?? 0,
        max: m.max_contacts ?? 0,
        replied: m.replied_count ?? 0,
        nextRunAt: m.next_run_at ?? null,
      })),
  };
}
