type WhatsAppContact = {
  channel?: string | null;
  consent_state?: string | null;
  contactability_level?: string | null;
};

/** Permission for a first external WAOUH message, separate from reachability. */
export function permitsExternalWhatsApp(contact: WhatsAppContact | null | undefined): boolean {
  return contact?.channel === "whatsapp" &&
    ["opt_in", "partner_contract"].includes(contact.consent_state ?? "") &&
    ["C3", "C4", "C5"].includes(contact.contactability_level ?? "");
}
