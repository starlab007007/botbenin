export type TelChannel = "sms" | "rcs";
export type TelProvider = "not_configured" | "infobip" | "test";

export type TelSettings = {
  key: "default";
  enabled: boolean;
  provider: TelProvider;
  business_phone_e164: string | null;
  business_phone_display: string | null;
  rcs_sender_name: string;
  default_country_code: string;
  sms_enabled: boolean;
  rcs_enabled: boolean;
  fallback_to_sms: boolean;
  virtual_groups_enabled: boolean;
  native_groups_enabled: boolean;
  public_base_url: string;
  default_locale: string;
  terms_version: string;
  help_text: string;
};

export type TelAttachment = {
  url: string;
  mime_type?: string;
  name?: string;
  size?: number;
};

export type CanonicalInboundEvent = {
  schema: "waouh.tel.event.v1";
  provider: string;
  provider_event_id: string;
  provider_message_id: string;
  channel: TelChannel;
  sender: string;
  recipient: string | null;
  recipient_raw: string | null;
  external_thread_id: string | null;
  type: "text" | "image" | "file" | "location" | "suggestion";
  text: string;
  attachments: TelAttachment[];
  location: { latitude: number; longitude: number; label?: string } | null;
  occurred_at: string;
  raw: Record<string, unknown>;
};

export type WaouhProduct = {
  id?: string;
  title?: string;
  price?: number | null;
  currency?: string;
  city?: string | null;
  description?: string | null;
  photos?: string[];
  image_url?: string | null;
  source_url?: string | null;
};

export type WaouhAction = {
  id?: string;
  label?: string;
  title?: string;
  url?: string;
  value?: string;
};

export type WaouhEngineReply = {
  schema: "waouh.message.v1";
  text: string;
  intent?: string | null;
  products: WaouhProduct[];
  actions: WaouhAction[];
  attachments: TelAttachment[];
  raw?: Record<string, unknown>;
};

export type TelOutboundPayload = {
  schema: "waouh.tel.outbound.v1";
  text: string;
  products?: WaouhProduct[];
  actions?: WaouhAction[];
  attachments?: TelAttachment[];
  room?: { code_hint: string; name: string; sender_name?: string | null };
  metadata?: Record<string, unknown>;
};

export type ProviderSendResult = {
  ok: boolean;
  provider_message_id?: string;
  channel: TelChannel;
  status?: string;
  retryable?: boolean;
  error?: string;
  raw?: unknown;
};
