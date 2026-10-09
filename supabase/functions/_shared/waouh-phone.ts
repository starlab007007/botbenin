// Helpers de normalisation des numéros téléphoniques pour WAOUH.
// Au Bénin, depuis 2021 les numéros mobiles font 10 chiffres (préfixe 01).
// On rencontre encore d'anciennes saisies à 8 chiffres ; pour fiabiliser les
// recherches en base, on génère TOUS les candidats canoniques possibles.

export type ResolvedWaouhUser = {
  id: string;
  phone_number: string | null;
  web_session_id: string | null;
  channel?: string | null;
};

/**
 * Renvoie le numéro canonique principal (229 + local) ou null.
 *
 * 🔒 Strict : refuse les valeurs alphanumériques (ex: "229E2ECS64284" venant
 * des stubs E2E) qui, sans ce garde-fou, étaient transformées en faux MSISDN
 * "229264284" puis enfilées dans la queue WhatsApp.
 *
 * Formats Bénin acceptés :
 *   - 229 + 8 chiffres locaux (ancien format)
 *   - 22901 + 8 chiffres locaux (réforme 2021, 10 chiffres locaux)
 *   - LID natif (`<digits>@lid`)
 */
export function normalizeBeninPhone(value: string | null | undefined): string | null {
  const original = String(value || "");
  if (original.includes("@lid")) {
    const lid = original.replace(/\D/g, "");
    return lid ? `${lid}@lid` : null;
  }
  // Refus strict : tout caractère lettre non-LID = stub/fake (E2E).
  if (/[A-Za-z]/.test(original)) return null;
  const digits = original.replace(/\D/g, "");
  if (!digits) return null;
  // 🔒 Jamais de numéro fabriqué : une longue suite de chiffres (≥ 14) qui n'est pas
  // un numéro béninois valide est un identifiant WhatsApp privé (LID), pas un MSISDN.
  // Avant, « last8 » transformait un LID en faux numéro 229XXXXXXXX.
  let candidate: string | null = null;
  if (digits.startsWith("00229")) candidate = digits.slice(2);
  else if (digits.startsWith("229")) candidate = digits;
  else if (digits.length === 8) candidate = `229${digits}`;
  else if (digits.length === 10 && digits.startsWith("01")) candidate = `229${digits}`;
  if (candidate && /^229(\d{8}|01\d{8})$/.test(candidate)) return candidate;
  if (digits.length >= 14) return `${digits}@lid`;
  return null;
}

/** true si la valeur normalisée est un identifiant WhatsApp privé (LID) et non un MSISDN. */
export function isWhatsAppLid(value: string | null | undefined): boolean {
  return /@lid$/.test(String(value || ""));
}

/**
 * Renvoie la liste de tous les formats Bénin équivalents pour la même ligne.
 * - 229XXXXXXXX (8 chiffres locaux, ancien format)
 * - 22901XXXXXXXX (10 chiffres locaux avec 01, nouveau format)
 * Plus la valeur brute si non-Bénin. Sans doublons, sans null.
 */
export function beninPhoneCandidates(value: string | null | undefined): string[] {
  const canon = normalizeBeninPhone(value);
  const out = new Set<string>();
  if (canon) out.add(canon);

  if (canon && !canon.includes("@") && canon.startsWith("229")) {
    const local = canon.slice(3);
    // Ancien -> nouveau (8 -> 10)
    if (local.length === 8) {
      out.add(`22901${local}`);
    }
    // Nouveau -> ancien (10 commençant par 01 -> 8)
    if (local.length === 10 && local.startsWith("01")) {
      out.add(`229${local.slice(2)}`);
    }
  }

  const raw = String(value || "").trim();
  if (raw && !out.has(raw)) out.add(raw);
  return [...out];
}

/** Cherche un waouh_users en testant toutes les variantes Bénin. */
export async function resolveWaouhUserByPhone(
  sb: any,
  rawPhone: string | null | undefined,
): Promise<ResolvedWaouhUser | null> {
  const candidates = beninPhoneCandidates(rawPhone);
  if (candidates.length === 0) return null;
  const { data } = await sb
    .from("waouh_users")
    .select("id, phone_number, web_session_id, channel")
    .in("phone_number", candidates)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Trouve ou crée un waouh_users "stub" à partir d'un numéro brut. */
export async function ensureWaouhVendorStub(
  sb: any,
  rawPhone: string | null | undefined,
  opts: { display_name?: string | null; city?: string | null; stub_origin?: string } = {},
): Promise<ResolvedWaouhUser | null> {
  const canonical = normalizeBeninPhone(rawPhone);
  if (!canonical) return null;
  const existing = await resolveWaouhUserByPhone(sb, rawPhone);
  if (existing) return existing;
  const { data: created } = await sb.from("waouh_users").insert({
    phone_number: canonical,
    display_name: opts.display_name || "Vendeur",
    channel: "whatsapp",
    city: opts.city ?? null,
  }).select("id, phone_number, web_session_id, channel").single();
  return created ?? null;
}
