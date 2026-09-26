import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  queryInfobipCapability,
  sendProviderMessage,
} from "../_shared/waouh-tel/provider.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const defaultOrigins = new Set([
  "https://bot.bj",
  "https://www.bot.bj",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
]);

function corsHeaders(req?: Request) {
  const configured = (Deno.env.get("WAOUH_TEL_CORS_ORIGINS") ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const allowed = configured.length > 0 ? new Set(configured) : defaultOrigins;
  const origin = req?.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "https://bot.bj",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

type RuntimeReadiness = {
  phone_encryption_ready: boolean;
  phone_hash_ready: boolean;
  webhook_ready: boolean;
  internal_secret_ready: boolean;
  infobip_base_url_ready: boolean;
  infobip_api_key_ready: boolean;
  provider_ready: boolean;
  retry_worker_ready: boolean;
  runtime_ready: boolean;
};

const allowedProviders = new Set(["not_configured", "infobip", "test"]);

const defaultSettings = {
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

function json(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

async function runtimeReadiness(
  admin: any,
  provider: string,
): Promise<RuntimeReadiness> {
  const { data, error } = await admin.rpc("waouh_tel_runtime_readiness");
  const source = !error && data && typeof data === "object" ? data : {};
  const phoneEncryptionReady = source.phone_encryption_ready === true;
  const phoneHashReady = source.phone_hash_ready === true;
  const webhookReady = source.webhook_ready === true;
  const internalSecretReady = source.internal_secret_ready === true;
  const infobipBaseUrlReady = source.infobip_base_url_ready === true;
  const infobipApiKeyReady = source.infobip_api_key_ready === true;
  const retryWorkerReady = source.retry_worker_ready === true;
  const providerReady = provider === "infobip"
    ? infobipBaseUrlReady && infobipApiKeyReady
    : provider === "test" &&
      Deno.env.get("WAOUH_TEL_ALLOW_TEST_PROVIDER") === "true";
  return {
    phone_encryption_ready: phoneEncryptionReady,
    phone_hash_ready: phoneHashReady,
    webhook_ready: webhookReady,
    internal_secret_ready: internalSecretReady,
    infobip_base_url_ready: infobipBaseUrlReady,
    infobip_api_key_ready: infobipApiKeyReady,
    provider_ready: providerReady,
    retry_worker_ready: retryWorkerReady,
    runtime_ready: phoneEncryptionReady && phoneHashReady && webhookReady &&
      internalSecretReady && providerReady && retryWorkerReady,
  };
}

function normalizePhone(value: unknown): string {
  let phone = typeof value === "string"
    ? value.trim().replace(/[\s().-]/g, "")
    : "";
  if (phone.startsWith("00229")) phone = `+${phone.slice(2)}`;
  else if (phone.startsWith("229")) phone = `+${phone}`;
  else if (phone.startsWith("01")) phone = `+229${phone}`;
  return phone;
}

function normalizeE164(value: unknown): string {
  const raw = typeof value === "string"
    ? value.trim().replace(/[\s().-]/g, "")
    : "";
  if (raw.startsWith("00")) return `+${raw.slice(2)}`;
  return raw;
}

function formatPhone(phone: string): string {
  const match = phone.match(/^\+229(01)(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return match
    ? `+229 ${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`
    : phone;
}

function validateSettings(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Les paramètres sont requis.");
  }
  const value = input as Record<string, unknown>;
  const phone = normalizePhone(value.business_phone_e164);
  if (!/^\+22901\d{8}$/.test(phone)) {
    throw new TypeError("Le numéro doit respecter le format +22901XXXXXXXX.");
  }
  const senderName = typeof value.rcs_sender_name === "string"
    ? value.rcs_sender_name.trim()
    : "";
  if (senderName.length < 2 || senderName.length > 40) {
    throw new TypeError(
      "Le nom expéditeur RCS doit contenir entre 2 et 40 caractères.",
    );
  }
  const provider = typeof value.provider === "string" ? value.provider : "";
  if (!allowedProviders.has(provider)) {
    throw new TypeError("Le fournisseur sélectionné n’est pas reconnu.");
  }
  const enabled = value.enabled === true;
  const smsEnabled = value.sms_enabled === true;
  const rcsEnabled = value.rcs_enabled === true;
  const fallbackToSms = value.fallback_to_sms !== false;
  const virtualGroupsEnabled = value.virtual_groups_enabled === true;
  if (enabled && !smsEnabled && !rcsEnabled) {
    throw new TypeError("Activez SMS ou RCS avant d’activer le service.");
  }
  if (enabled && provider === "not_configured") {
    throw new TypeError("Configurez un fournisseur avant d’activer le service.");
  }
  if (virtualGroupsEnabled && !enabled) {
    throw new TypeError("Activez le service avant les groupes virtuels.");
  }
  return {
    business_phone_e164: phone,
    business_phone_display: formatPhone(phone),
    rcs_sender_name: senderName,
    provider,
    default_country_code: "+229",
    enabled,
    sms_enabled: smsEnabled,
    rcs_enabled: rcsEnabled,
    fallback_to_sms: fallbackToSms,
    virtual_groups_enabled: virtualGroupsEnabled,
  };
}

async function requireAdministrator(req: Request) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return { ok: false as const, response: json({ ok: false, error: "Configuration serveur incomplète." }, 500, req) };
  }
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return { ok: false as const, response: json({ ok: false, error: "Authentification requise." }, 401, req) };
  }
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice(7);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return { ok: false as const, response: json({ ok: false, error: "Session invalide." }, 401, req) };
  }
  const [adminRole, superAdminRole] = await Promise.all([
    admin.rpc("has_role", { _user_id: userData.user.id, _role_name: "admin" }),
    admin.rpc("has_role", { _user_id: userData.user.id, _role_name: "super_admin" }),
  ]);
  if (adminRole.error || superAdminRole.error) {
    return { ok: false as const, response: json({ ok: false, error: "Vérification du rôle impossible." }, 500, req) };
  }
  if (!adminRole.data && !superAdminRole.data) {
    return { ok: false as const, response: json({ ok: false, error: "Accès administrateur requis." }, 403, req) };
  }
  return { ok: true as const, admin, userId: userData.user.id };
}

async function loadSettings(admin: any) {
  const { data, error } = await admin.from("waouh_tel_settings").select("*")
    .eq("key", "default").maybeSingle();
  if (error) throw error;
  return data ?? defaultSettings;
}

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const access = await requireAdministrator(req);
  if (!access.ok) return access.response;
  const { admin, userId } = access;

  try {
    const body = req.method === "POST"
      ? await req.json().catch(() => ({})) as Record<string, unknown>
      : {};
    const action = req.method === "GET" ? "get" : req.method === "PUT" ? "save" : body.action;

    if (action === "get") {
      const settings = await loadSettings(admin);
      const runtime = await runtimeReadiness(admin, settings.provider);
      return json({ ok: true, data: settings, runtime }, 200, req);
    }

    if (action === "configure_provider") {
      const baseUrl = typeof body.base_url === "string"
        ? body.base_url.trim().replace(/\/$/, "")
        : "";
      const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
      if (!baseUrl && !apiKey) {
        return json({ ok: false, error: "Renseignez l’URL Infobip ou la clé API." }, 400, req);
      }
      if (baseUrl) {
        const { error } = await admin.rpc("waouh_tel_set_runtime_secret", {
          p_name: "infobip_base_url",
          p_value: baseUrl,
        });
        if (error) throw error;
      }
      if (apiKey) {
        const { error } = await admin.rpc("waouh_tel_set_runtime_secret", {
          p_name: "infobip_api_key",
          p_value: apiKey,
        });
        if (error) throw error;
      }
      const settings = await loadSettings(admin);
      const runtime = await runtimeReadiness(admin, "infobip");
      return json({ ok: true, data: settings, runtime }, 200, req);
    }

    if (action === "rotate_webhook_secret") {
      const secret = randomSecret();
      const { error } = await admin.rpc("waouh_tel_set_runtime_secret", {
        p_name: "webhook_secret",
        p_value: secret,
      });
      if (error) throw error;
      return json({
        ok: true,
        secret,
        note: "Copiez ce secret maintenant. Il ne sera plus affiché.",
      }, 200, req);
    }

    if (action === "test_send") {
      const channel = body.channel === "rcs" ? "rcs" : "sms";
      const destination = normalizeE164(body.destination);
      if (!/^\+[1-9]\d{7,14}$/.test(destination)) {
        return json({ ok: false, error: "Numéro de test E.164 invalide." }, 400, req);
      }
      if (body.confirmed_consent !== true) {
        return json({ ok: false, error: "Confirmez que le destinataire accepte ce message de test." }, 400, req);
      }
      const settings = await loadSettings(admin);
      const runtime = await runtimeReadiness(admin, settings.provider);
      if (settings.provider !== "infobip" || !runtime.provider_ready) {
        return json({ ok: false, error: "Infobip n’est pas encore prêt.", runtime }, 409, req);
      }
      if (!settings.business_phone_e164) {
        return json({ ok: false, error: "Configurez d’abord le numéro WAOUH." }, 409, req);
      }
      if (channel === "sms" && !settings.sms_enabled) {
        return json({ ok: false, error: "Le canal SMS est désactivé." }, 409, req);
      }
      if (channel === "rcs") {
        if (!settings.rcs_enabled) {
          return json({ ok: false, error: "Le canal RCS est désactivé." }, 409, req);
        }
        const capability = await queryInfobipCapability(settings, destination);
        if (!capability.reachable) {
          return json({
            ok: false,
            error: "Ce numéro n’est pas actuellement joignable en RCS avec ce sender.",
            capability_checked: true,
          }, 409, req);
        }
      }
      const result = await sendProviderMessage({
        settings,
        destination,
        channel,
        payload: {
          schema: "waouh.tel.outbound.v1",
          text: channel === "rcs"
            ? "WAOUH — test réel RCS réussi. Votre canal enrichi est opérationnel."
            : "WAOUH — test réel SMS réussi. Votre canal Native Messaging est opérationnel.",
          products: [],
          actions: [],
          attachments: [],
          metadata: { admin_test: true },
        },
        callbackData: `admin-test:${crypto.randomUUID()}`,
      });
      if (!result.ok) {
        return json({
          ok: false,
          error: result.error || "Envoi fournisseur refusé.",
          channel,
          retryable: result.retryable === true,
        }, 502, req);
      }
      return json({
        ok: true,
        channel: result.channel,
        provider_message_id: result.provider_message_id,
        status: result.status || "accepted",
      }, 200, req);
    }

    if (action === "save") {
      const input = req.method === "PUT" ? await req.json().catch(() => null) : body.settings;
      const settings = validateSettings(input);
      const runtime = await runtimeReadiness(admin, settings.provider);
      if (settings.enabled && !runtime.runtime_ready) {
        return json({
          ok: false,
          error: "Le runtime télécom n’est pas prêt. Complétez Infobip et le worker avant d’activer le service.",
          runtime,
        }, 409, req);
      }
      const { data: current, error: readError } = await admin
        .from("waouh_tel_settings")
        .select("native_groups_enabled,enabled,business_phone_e164,provider")
        .eq("key", "default").maybeSingle();
      if (readError) throw readError;
      if (
        current?.enabled === true && settings.enabled === true &&
        (current.business_phone_e164 !== settings.business_phone_e164 ||
          current.provider !== settings.provider)
      ) {
        return json({
          ok: false,
          error: "Désactivez d’abord le service avant de changer son numéro ou son fournisseur.",
          runtime,
        }, 409, req);
      }
      const { data, error } = await admin.from("waouh_tel_settings").upsert({
        key: "default",
        ...settings,
        native_groups_enabled: current?.native_groups_enabled === true &&
          settings.rcs_enabled,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" }).select("*").single();
      if (error) throw error;
      return json({ ok: true, data, runtime }, 200, req);
    }

    return json({ ok: false, error: "Action inconnue." }, 400, req);
  } catch (error) {
    if (error instanceof TypeError) {
      return json({ ok: false, error: error.message }, 400, req);
    }
    console.error("[waouh-native-messaging-settings]", error);
    return json({ ok: false, error: "Impossible de gérer les paramètres Native Messaging." }, 500, req);
  }
});
