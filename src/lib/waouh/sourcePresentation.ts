const sourceNames: Record<string, string> = {
  waouh_app: "WAOUH", partner: "Partenaire", whatsapp: "WhatsApp",
  share_to_waouh: "Offre partagée", radar_ia: "Radar IA", serpapi: "Web public",
  apify: "Web social", google_places: "Google Maps", facebook_business: "Facebook",
  instagram_business: "Instagram", tiktok_connected: "TikTok", telegram_public: "Telegram",
  benin_directory: "Annuaire Bénin", b2b_rfq: "Professionnels", scout: "Terrain",
  voice: "Voix", sms_rcs: "SMS / RCS", ussd: "USSD",
};
export const sourceDisplayName = (key?: string | null) => key ? sourceNames[key] || key.replace(/_/g, " ") : "Source à vérifier";
