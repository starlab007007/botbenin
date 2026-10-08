import { redactPublicContacts, safeSourceUrl } from "./waouh-signal-fabric.ts";
/** Public browsing only: no contact, mission, provider refresh or personal history. */
export const isPublicNexusRead = (action: string) => ["nexus.global_discovery", "nexus.sources"].includes(action);
export const PUBLIC_NEXUS_SOURCES = ["waouh_app", "partner", "google_places", "serpapi", "apify", "benin_directory", "facebook_business", "instagram_business", "telegram_public"];
export function publicNexusResult(row: Record<string, unknown>) {
  const sourceUrl = safeSourceUrl(row.source_url);
  const url = sourceUrl ? new URL(sourceUrl) : null;
  if (url) { url.search = ""; url.hash = ""; }
  return {
    fabric_id: row.fabric_id, source_key: row.source_key, source_url: url && !url.username && !url.password ? url.toString() : null,
    subject: redactPublicContacts(row.subject), category: row.category, intent: row.intent,
    price_min: row.price_min, price_max: row.price_max, city: row.city, observed_at: row.observed_at,
    scores: row.scores ? { ...(row.scores as Record<string, unknown>), contactability_score: 0, reasons: ((row.scores as { reasons?: string[] }).reasons ?? []).filter(reason => reason !== "Contact autorisé") } : undefined,
    contact_policy: { level: "C0", label: "Connexion requise pour préparer le contact", can_reveal: false, can_auto_contact: false, can_blind_message: false, can_user_confirm_contact: false, requires_approval: true },
  };
}
