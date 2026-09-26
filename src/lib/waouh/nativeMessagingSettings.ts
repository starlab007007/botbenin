export const WAOUH_NATIVE_MESSAGING_PROVIDERS = [
  "not_configured",
  "infobip",
  "test",
] as const;

export type WaouhNativeMessagingProvider =
  (typeof WAOUH_NATIVE_MESSAGING_PROVIDERS)[number];

export interface WaouhNativeMessagingSettings {
  key: "default";
  business_phone_e164: string;
  business_phone_display: string;
  rcs_sender_name: string;
  provider: WaouhNativeMessagingProvider;
  default_country_code: "+229";
  enabled: boolean;
  sms_enabled: boolean;
  rcs_enabled: boolean;
  fallback_to_sms: boolean;
  virtual_groups_enabled: boolean;
  native_groups_enabled: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export const DEFAULT_NATIVE_MESSAGING_SETTINGS: WaouhNativeMessagingSettings = {
  key: "default",
  business_phone_e164: "",
  business_phone_display: "",
  rcs_sender_name: "WAOUH",
  provider: "not_configured",
  default_country_code: "+229",
  enabled: false,
  sms_enabled: true,
  rcs_enabled: false,
  fallback_to_sms: true,
  virtual_groups_enabled: false,
  native_groups_enabled: false,
  updated_at: null,
  updated_by: null,
};

const BENIN_PHONE_PATTERN = /^\+22901\d{8}$/;

export function normalizeBeninPhone(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!compact) return "";
  if (compact.startsWith("00229")) return `+${compact.slice(2)}`;
  if (compact.startsWith("229")) return `+${compact}`;
  if (compact.startsWith("01")) return `+229${compact}`;
  return compact;
}

export function isValidBeninPhone(value: string): boolean {
  return BENIN_PHONE_PATTERN.test(normalizeBeninPhone(value));
}

export function formatBeninPhone(value: string): string {
  const phone = normalizeBeninPhone(value);
  const match = phone.match(/^\+229(01)(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return match
    ? `+229 ${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`
    : value;
}

export function buildSmsUri(
  phone: string,
  message = "BONJOUR WAOUH",
  platform: "android" | "ios" = "android",
): string {
  const normalized = normalizeBeninPhone(phone);
  if (!isValidBeninPhone(normalized)) return "";
  const separator = platform === "ios" ? "&" : "?";
  return `sms:${normalized}${separator}body=${encodeURIComponent(message)}`;
}

export function validateNativeMessagingSettings(
  settings: WaouhNativeMessagingSettings,
): string[] {
  const errors: string[] = [];
  const phone = normalizeBeninPhone(settings.business_phone_e164);

  if (!isValidBeninPhone(phone)) {
    errors.push("Le numéro doit respecter le format +22901XXXXXXXX.");
  }
  const senderName = settings.rcs_sender_name.trim();
  if (senderName.length < 2 || senderName.length > 40) {
    errors.push("Le nom expéditeur RCS doit contenir entre 2 et 40 caractères.");
  }
  if (!WAOUH_NATIVE_MESSAGING_PROVIDERS.includes(settings.provider)) {
    errors.push("Le fournisseur sélectionné n’est pas reconnu.");
  }
  if (settings.enabled && !settings.sms_enabled && !settings.rcs_enabled) {
    errors.push("Activez SMS ou RCS avant d’activer le service.");
  }
  if (settings.enabled && settings.provider === "not_configured") {
    errors.push("Configurez un fournisseur avant d’activer le service.");
  }
  if (settings.virtual_groups_enabled && !settings.enabled) {
    errors.push("Activez le service avant les groupes virtuels.");
  }
  return errors;
}

export function coerceNativeMessagingSettings(
  value: unknown,
): WaouhNativeMessagingSettings {
  const input = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const provider = typeof input.provider === "string" &&
      WAOUH_NATIVE_MESSAGING_PROVIDERS.includes(
        input.provider as WaouhNativeMessagingProvider,
      )
    ? input.provider as WaouhNativeMessagingProvider
    : DEFAULT_NATIVE_MESSAGING_SETTINGS.provider;
  const phone = normalizeBeninPhone(String(input.business_phone_e164 ?? ""));

  return {
    ...DEFAULT_NATIVE_MESSAGING_SETTINGS,
    key: "default",
    business_phone_e164: phone,
    business_phone_display: typeof input.business_phone_display === "string"
      ? input.business_phone_display
      : (phone ? formatBeninPhone(phone) : ""),
    rcs_sender_name: typeof input.rcs_sender_name === "string"
      ? input.rcs_sender_name
      : DEFAULT_NATIVE_MESSAGING_SETTINGS.rcs_sender_name,
    provider,
    default_country_code: "+229",
    enabled: input.enabled === true,
    sms_enabled: input.sms_enabled !== false,
    rcs_enabled: input.rcs_enabled === true,
    fallback_to_sms: input.fallback_to_sms !== false,
    virtual_groups_enabled: input.virtual_groups_enabled === true,
    native_groups_enabled: input.native_groups_enabled === true,
    updated_at: typeof input.updated_at === "string" ? input.updated_at : null,
    updated_by: typeof input.updated_by === "string" ? input.updated_by : null,
  };
}
