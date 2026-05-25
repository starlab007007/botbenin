// WAOUH — Module unique de composition (source de vérité)
// Centralise les textes (carte paiement, instructions) et sets d'actions
// pour éviter la duplication et les fragments legacy.

export const fmtFCFA = (n: number | null | undefined) => {
  if (n == null) return "prix à discuter";
  return new Intl.NumberFormat("fr-FR").format(Math.round(Number(n))) + " FCFA";
};

/**
 * Carte de paiement WAOUH — version propre (sans phrase legacy
 * "Appuyez sur Payer ou envoyez payer 0165653468" ni liste 1/2/3).
 * Utilisée pour notifier l'autre partie qu'un paiement est lié à une négo.
 */
export function paymentCard(amount: number, txId?: string | null): string {
  return (
    `\n\n💳 *Carte de paiement WAOUH*` +
    `\n• *Montant* : ${fmtFCFA(amount)}` +
    `\n• *Sécurité* : escrow WAOUH (fonds bloqués)` +
    `\n• *Statut* : en attente` +
    `\n• *Référence* : ${txId ? String(txId).slice(0, 8).toUpperCase() : "créée"}`
  );
}

/**
 * Instructions paiement (étape PAY) — sans phrase legacy.
 * Les boutons interactifs WAHA gèrent les actions Payer/MTN/Moov.
 */
export function paymentInstructions(amount: number, txId?: string | null): string {
  return (
    `💳 *Paiement prêt*` +
    paymentCard(amount, txId) +
    `\n\nvalidez la notification reçue sur votre téléphone`
  );
}

/** Actions vendeur après publication d'annonce. */
export function sellerArticleActions(articleId: string) {
  return [
    { id: `seller_boost:${articleId}`, label: "🚀 Booster" },
    { id: `seller_edit:${articleId}`, label: "✏️ Modifier" },
    { id: `seller_pause:${articleId}`, label: "⏸️ Pause" },
  ];
}

/** Actions vendeur quand un acheteur s'intéresse (négo ouverte). */
export function sellerNegotiationActions(negId: string) {
  return [
    { id: `accept:${negId || ""}`, label: "✅ Accepter" },
    { id: `counter:${negId || ""}`, label: "💬 Contre-offre" },
    { id: `refuse:${negId || ""}`, label: "❌ Refuser" },
  ];
}

/** Actions acheteur pour choisir parmi N résultats (max 3 boutons WAHA). */
export function buyerInterestActions(count: number) {
  return Array.from({ length: Math.min(count, 3) }, (_, i) => ({
    id: `intéressé ${i + 1}`,
    label: `✅ Choisir n°${i + 1}`,
  }));
}

/**
 * Actions paiement — Payer (url) + MTN + Moov.
 * Si `payUrl` absent, bouton Payer rejoue le mot-clé.
 */
export function paymentActions(txId: string | null, payUrl?: string | null) {
  const arr: Array<{ id: string; label: string; url?: string }> = [];
  if (payUrl) arr.push({ id: "pay_open", label: "💳 Payer maintenant", url: payUrl });
  else arr.push({ id: `pay:${txId || ""}`, label: "💳 Payer maintenant" });
  arr.push({ id: "mtn", label: "MTN" });
  arr.push({ id: "moov", label: "Moov" });
  return arr;
}

/** Marketing-cleanup: retire les phrases legacy de tout texte sortant (paiement, escrow, listes 1./2./3.). */
export function stripLegacyPaymentText(text: string): string {
  if (!text) return text;
  return text
    // Anciennes phrases « Appuyez sur Payer / envoyez payer 0XXXXXXXX »
    .replace(/\n*👉\s*Appuyez sur \*?Payer\*?[^]*?(?:payer\s*0?165653468|payer\s*\d{8,})\*?/gi, "")
    // Carte de paiement WAOUH complète
    .replace(/\n*💳\s*\*?Carte de paiement WAOUH\*?[\s\S]*?(?=\n{2,}|$)/gi, "")
    // Bloc « Payer maintenant : … MTN / Moov »
    .replace(/\n*Payer maintenant\s*:?[\s\S]*?(?:Moov[^\n]*|MTN[^\n]*)/gi, "")
    // « Vous pouvez maintenant payer en Mobile Money. »
    .replace(/\n*Vous pouvez maintenant payer[^\n]*/gi, "")
    // « L'acheteur va lancer le paiement. »
    .replace(/\n*L'acheteur va lancer le paiement\.?/gi, "")
    // Phrase escrow / fonds bloqués
    .replace(/\n*🔒?\s*Les fonds restent en escrow[^\n]*/gi, "")
    .replace(/\n*[•\-]?\s*\*?Sécurité\*?\s*:\s*escrow[^\n]*/gi, "")
    // Listes numérotées 1./2./3. d'actions (Accepter / Contre-offre / Refuser / Oui mettre en contact / Non merci / Payer / MTN / Moov)
    .replace(/(?:^|\n)\s*1\.\s*(?:✅|💬|❌|💳)?[^\n]*\n\s*2\.\s*(?:✅|💬|❌|💳|MTN|Moov)[^\n]*(?:\n\s*3\.\s*(?:✅|💬|❌|💳|MTN|Moov)[^\n]*)?/gi, "")
    // Mentions résiduelles « (paiement sécurisé escrow, 0 fraude) »
    .replace(/\s*\(paiement\s+sécuris[eé][^)]*\)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


/** Header décoratif WAOUH (avec lignes de séparation). */
export function waouhHeader(title: string): string {
  return `━━━━━━━━━━━━━━━━━━\n*${title}*\n━━━━━━━━━━━━━━━━━━`;
}

/** Pied de page / signature WAOUH. */
export function waouhFooter(tagline = "WAOUH — Achetez · Vendez · Négociez en confiance"): string {
  return `━━━━━━━━━━━━━━━━━━\n_✨ ${tagline}_`;
}

/** Séparateur léger entre blocs. */
export const waouhSep = "━━━━━━━━━━━━━━━━━━";

/** Calcule la distance Haversine en km (1 décimale). */
export function distanceKm(lat1: number | null | undefined, lng1: number | null | undefined, lat2: number | null | undefined, lng2: number | null | undefined): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLng = toRad(Number(lng2) - Number(lng1));
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(Number(lat1))) * Math.cos(toRad(Number(lat2))) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function formatDistance(km: number | null): string {
  if (km == null) return "";
  if (km < 1) return `📏 *à ${Math.round(km * 1000)} m de vous*`;
  return `📏 *à ${km.toString().replace(".", ",")} km de vous*`;
}

/**
 * Analyse marché IA réelle, synthétique (1 phrase max 25 mots).
 * Best-effort, ne lève jamais — renvoie "" en cas d'erreur. Cache 10 min.
 */
const _marketCache = new Map<string, { at: number; text: string }>();
export async function marketAnalysisAI(opts: { title: string; price: number; min: number; max: number; city?: string | null; apiKey?: string | null }): Promise<string> {
  const key = `${(opts.title || "").toLowerCase()}|${opts.price}|${opts.min}|${opts.max}|${(opts.city || "").toLowerCase()}`;
  const cached = _marketCache.get(key);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.text;
  const apiKey = opts.apiKey || (typeof Deno !== "undefined" ? (Deno as any).env.get("LOVABLE_API_KEY") : "");
  if (!apiKey) return "";
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: 'Tu es analyste marché Bénin (Cotonou et environs). Donne UNE seule phrase factuelle (≤25 mots), neutre et chiffrée, qui qualifie le prix proposé par rapport à la fourchette marché et à la ville. Pas de bla-bla. JSON: {"note": string}.' },
          { role: "user", content: `Produit: ${opts.title}\nPrix proposé: ${opts.price} FCFA\nFourchette marché: ${opts.min} – ${opts.max} FCFA\nVille: ${opts.city || "Cotonou"}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const d = await r.json();
    const note = (() => { try { return JSON.parse(d?.choices?.[0]?.message?.content ?? "{}")?.note || ""; } catch { return ""; } })();
    const text = typeof note === "string" ? note.trim() : "";
    _marketCache.set(key, { at: Date.now(), text });
    return text;
  } catch { return ""; }
}

/**
 * Build contact + geoloc block to share between buyer/seller after agreement.
 * Pas de lien Maps — affichage direct ville + distance live.
 */
/** Normalise un numéro brut en E.164 si plausible (10–15 chiffres). */
function toE164OrEmpty(raw: string | null | undefined): string {
  if (!raw) return "";
  let digits = String(raw).replace(/@(?:c\.us|s\.whatsapp\.net|lid)$/i, "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00229")) digits = digits.slice(2);
  if (digits.startsWith("229")) return digits.length >= 11 && digits.length <= 15 ? `+${digits}` : "";
  if (digits.length === 8 || (digits.length === 10 && digits.startsWith("01"))) return `+229${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return "";
}

function firstE164(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const phone = toE164OrEmpty(value);
    if (phone) return phone;
  }
  return "";
}

async function resolveProductOwnerPhoneE164(sb: any, articleId: string | null | undefined, expectedSellerUserId?: string | null): Promise<string> {
  if (!articleId) return "";

  try {
    const { data: art } = await sb
      .from("waouh_articles")
      .select("seller_id, origin_signal_id")
      .eq("id", articleId)
      .maybeSingle();

    if (art) {
      if (expectedSellerUserId && art.seller_id && art.seller_id !== expectedSellerUserId) return "";

      if (art.origin_signal_id) {
        const { data: ext } = await sb
          .from("waouh_external_listings")
          .select("seller_phone")
          .eq("id", art.origin_signal_id)
          .maybeSingle();
        const radarPhone = firstE164(ext?.seller_phone);
        if (radarPhone) return radarPhone;
      }

      if (art.seller_id) {
        const { data: sellerUser } = await sb
          .from("waouh_users")
          .select("auth_user_id")
          .eq("id", art.seller_id)
          .maybeSingle();
        if (sellerUser?.auth_user_id) {
          const { data: partner } = await sb
            .from("waouh_partners")
            .select("id, whatsapp, telephone, mobile_money_number")
            .eq("user_id", sellerUser.auth_user_id)
            .maybeSingle();
          const partnerPhone = firstE164(partner?.whatsapp, partner?.telephone, partner?.mobile_money_number);
          if (partnerPhone) return partnerPhone;
          if (partner?.id) {
            const { data: biz } = await sb
              .from("waouh_partner_businesses")
              .select("whatsapp, telephone, mobile_money_number")
              .eq("partner_id", partner.id)
              .limit(1)
              .maybeSingle();
            const businessPhone = firstE164(biz?.whatsapp, biz?.telephone, biz?.mobile_money_number);
            if (businessPhone) return businessPhone;
          }
        }
      }
    }
  } catch (_) { /* fallback unified catalog below */ }

  try {
    const { data: item } = await sb
      .from("waouh_unified_catalog")
      .select("vendeur_whatsapp, vendeur_phone, business_id, partner_id")
      .eq("id", articleId)
      .maybeSingle();
    const catalogPhone = firstE164(item?.vendeur_whatsapp, item?.vendeur_phone);
    if (catalogPhone) return catalogPhone;
    if (item?.business_id) {
      const { data: biz } = await sb
        .from("waouh_partner_businesses")
        .select("whatsapp, telephone, mobile_money_number, partner_id")
        .eq("id", item.business_id)
        .maybeSingle();
      const businessPhone = firstE164(biz?.whatsapp, biz?.telephone, biz?.mobile_money_number);
      if (businessPhone) return businessPhone;
      if (!item.partner_id && biz?.partner_id) item.partner_id = biz.partner_id;
    }
    if (item?.partner_id) {
      const { data: partner } = await sb
        .from("waouh_partners")
        .select("whatsapp, telephone, mobile_money_number")
        .eq("id", item.partner_id)
        .maybeSingle();
      const partnerPhone = firstE164(partner?.whatsapp, partner?.telephone, partner?.mobile_money_number);
      if (partnerPhone) return partnerPhone;
    }
  } catch (_) { /* ignore */ }

  return "";
}

/**
 * Résout le vrai numéro WhatsApp / téléphone E.164 d'un utilisateur WAOUH
 * en parcourant TOUTES les sources connues, dans l'ordre de priorité :
 *
 *   1. user.phone_number direct (E.164, non-@lid)             — source chat WhatsApp
 *   2. waouh_lid_phone_map (si @lid)                          — source chat WhatsApp anonymisée
 *   3. auth.users.phone (via auth_user_id)                    — source web bot.bj
 *   4. profiles.phone (via auth_user_id)                      — fallback web bot.bj
 *   5. waouh_partners.whatsapp / telephone (via auth_user_id) — source partenaire
 *   6. waouh_partner_businesses.whatsapp / telephone          — source partenaire (par article_id)
 *   7. waouh_external_listings.seller_phone                   — source radar IA (par article_id)
 *
 * Retourne "" si aucune source ne livre un numéro exploitable.
 */
export async function resolveRealPhoneE164(
  sb: any,
  user: { id?: string | null; phone_number?: string | null; auth_user_id?: string | null } | null | undefined,
  opts?: { article_id?: string | null; role?: "buyer" | "seller" | "contact" }
): Promise<string> {
  if (!user) return opts?.role === "seller" ? await resolveProductOwnerPhoneE164(sb, opts?.article_id, null) : "";

  // Pour un vendeur, le contact attaché AU PRODUIT/ANNONCE prime sur le profil générique.
  if (opts?.role === "seller") {
    const productPhone = await resolveProductOwnerPhoneE164(sb, opts?.article_id, user.id ?? null);
    if (productPhone) return productPhone;
  }

  const raw = (user.phone_number || "").trim();

  // 1) Numéro direct E.164 (pas un LID anonyme)
  if (raw && !/@lid$/i.test(raw)) {
    const e164 = toE164OrEmpty(raw);
    if (e164) return e164;
  }

  // 2) Mapping LID → phone via waouh_lid_phone_map
  if (raw && /@lid$/i.test(raw)) {
    const lid = raw.replace(/@lid$/i, "");
    try {
      const { data } = await sb
        .from("waouh_lid_phone_map")
        .select("phone_e164, phone")
        .or(`lid.eq.${lid},lid.eq.${raw}`)
        .maybeSingle();
      const p = toE164OrEmpty(data?.phone_e164 || data?.phone);
      if (p) return p;
    } catch (_) { /* ignore */ }
  }

  // 3 & 4) Web bot.bj — auth.users.phone, puis profiles.phone
  if (user.auth_user_id) {
    try {
      const { data } = await sb.auth.admin.getUserById(user.auth_user_id);
      const p = toE164OrEmpty(data?.user?.phone);
      if (p) return p;
    } catch (_) { /* ignore */ }
    try {
      const { data } = await sb.from("profiles").select("phone").eq("id", user.auth_user_id).maybeSingle();
      const p = toE164OrEmpty(data?.phone);
      if (p) return p;
    } catch (_) { /* ignore */ }

    // 5) Partenaire bot.bj : waouh_partners (whatsapp/telephone)
    try {
      const { data } = await sb
        .from("waouh_partners")
        .select("whatsapp, telephone")
        .eq("user_id", user.auth_user_id)
        .maybeSingle();
      const p = toE164OrEmpty(data?.whatsapp) || toE164OrEmpty(data?.telephone);
      if (p) return p;
    } catch (_) { /* ignore */ }
  }

  // 6 & 7) Sources liées à l'article (partenaire business + radar externe)
  const articleId = opts?.article_id || null;
  if (opts?.role !== "buyer") {
    const productPhone = await resolveProductOwnerPhoneE164(sb, articleId, user.id ?? null);
    if (productPhone) return productPhone;
  }

  return "";
}

export function contactExchangeText(
  role: "buyer_to_seller" | "seller_to_buyer",
  other: { display_name?: string | null; phone_e164?: string | null; phone_number?: string | null; city?: string | null; distance_km?: number | null; location?: any }
): string {
  const who = role === "buyer_to_seller" ? "vendeur" : "acheteur";
  const name = other.display_name || `Contact ${who}`;
  // Préfère phone_e164 (déjà résolu via resolveRealPhoneE164)
  let formatted = (other.phone_e164 || "").trim();
  if (!formatted && other.phone_number && !/@lid$/i.test(other.phone_number)) {
    const digits = other.phone_number.replace(/@(?:c\.us|lid|s\.whatsapp\.net)$/i, "").replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) formatted = `+${digits}`;
  }
  const phoneLine = formatted
    ? `\n📞 *Téléphone* : ${formatted}\n🟢 *WhatsApp* : https://wa.me/${formatted.replace(/\D/g, "")}`
    : `\n📞 *Contact direct* : numéro privé — répondez sur WAOUH, nous transmettons votre message au ${who}.`;
  // Compose adresse : ville + quartier/adresse si dispo (depuis location JSON)
  const loc = other.location && typeof other.location === "object" ? other.location : null;
  const quartier = loc?.quartier || loc?.neighborhood || loc?.district || null;
  const adresse = loc?.address || loc?.adresse || loc?.street || null;
  const cityParts = [other.city, quartier, adresse].filter(Boolean);
  const cityLine = cityParts.length ? `\n🏙️ *Adresse* : ${cityParts.join(" — ")}` : "";
  const distLine = other.distance_km != null ? `\n${formatDistance(other.distance_km)}` : "";
  return (
    `📇 *Contact ${who}*\n${waouhSep}\n` +
    `👤 ${name}` +
    phoneLine +
    cityLine +
    distLine
  );
}


