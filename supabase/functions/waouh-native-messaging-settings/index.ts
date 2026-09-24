import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = configured.length > 0 ? new Set(configured) : defaultOrigins;
  const origin = req?.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowed.has(origin)
      ? origin
      : "https://bot.bj",
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
  provider_ready: boolean;
  retry_worker_ready: boolean;
  runtime_ready: boolean;
};

const allowedProviders = new Set([
  "not_configured",
  "infobip",
  "test",
]);

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
  const encryptionKey = Deno.env.get("WAOUH_TEL_PHONE_ENCRYPTION_KEY") ?? "";
  const hashKey = Deno.env.get("WAOUH_TEL_PHONE_HASH_KEY") ?? "";
  const webhookSecret = Deno.env.get("WAOUH_TEL_WEBHOOK_SECRET") ?? "";
  const internalSecret = Deno.env.get("WAOUH_TEL_INTERNAL_SECRET") ?? "";
  const infobipBaseUrl = Deno.env.get("WAOUH_TEL_INFOBIP_BASE_URL") ?? "";
  const infobipApiKey = Deno.env.get("WAOUH_TEL_INFOBIP_API_KEY") ?? "";
  const phoneEncryptionReady = encryptionKey.length >= 24;
  const phoneHashReady = hashKey.length >= 24 && hashKey !== encryptionKey;
  const webhookReady = webhookSecret.length >= 24;
  const internalSecretReady = internalSecret.length >= 24;
  const providerReady = provider === "infobip"
    ? /^https:\/\//i.test(infobipBaseUrl) && infobipApiKey.length >= 12
    : provider === "test" &&
      Deno.env.get("WAOUH_TEL_ALLOW_TEST_PROVIDER") === "true";
  const { data: retryWorker, error: retryWorkerError } = await admin.rpc(
    "waouh_tel_retry_worker_ready",
  );
  const retryWorkerReady = !retryWorkerError && retryWorker === true;
  return {
    phone_encryption_ready: phoneEncryptionReady,
    phone_hash_ready: phoneHashReady,
    webhook_ready: webhookReady,
    internal_secret_ready: internalSecretReady,
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
  const virtualGroupsEnabled = value.virtual_groups_enabled === true;
  if (enabled && !smsEnabled && !rcsEnabled) {
    throw new TypeError("Activez SMS ou RCS avant d’activer le service.");
  }
  if (enabled && provider === "not_configured") {
    throw new TypeError(
      "Configurez un fournisseur avant d’activer le service.",
    );
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
    virtual_groups_enabled: virtualGroupsEnabled,
  };
}

async function requireAdministrator(req: Request) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return {
      ok: false as const,
      response: json(
        { ok: false, error: "Configuration serveur incomplète." },
        500,
        req,
      ),
    };
  }
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return {
      ok: false as const,
      response: json(
        { ok: false, error: "Authentification requise." },
        401,
        req,
      ),
    };
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice(7);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return {
      ok: false as const,
      response: json({ ok: false, error: "Session invalide." }, 401, req),
    };
  }

  const [adminRole, superAdminRole] = await Promise.all([
    admin.rpc("has_role", { _user_id: userData.user.id, _role_name: "admin" }),
    admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role_name: "super_admin",
    }),
  ]);
  if (adminRole.error || superAdminRole.error) {
    console.error("[waouh-native-messaging-settings] role check failed", {
      adminRoleError: adminRole.error,
      superAdminRoleError: superAdminRole.error,
      userId: userData.user.id,
    });
    return {
      ok: false as const,
      response: json(
        { ok: false, error: "Vérification du rôle impossible." },
        500,
        req,
      ),
    };
  }
  if (!adminRole.data && !superAdminRole.data) {
    return {
      ok: false as const,
      response: json(
        { ok: false, error: "Accès administrateur requis." },
        403,
        req,
      ),
    };
  }
  return { ok: true as const, admin, userId: userData.user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  const access = await requireAdministrator(req);
  if (!access.ok) return access.response;
  const { admin, userId } = access;

  try {
    const body = req.method === "POST"
      ? await req.json().catch(() => ({})) as Record<string, unknown>
      : {};
    const action = req.method === "GET"
      ? "get"
      : req.method === "PUT"
      ? "save"
      : body.action;

    if (action === "get") {
      const { data, error } = await admin
        .from("waouh_tel_settings")
        .select(
          "key,business_phone_e164,business_phone_display,rcs_sender_name,provider,default_country_code,enabled,sms_enabled,rcs_enabled,virtual_groups_enabled,native_groups_enabled,updated_at,updated_by",
        )
        .eq("key", "default")
        .maybeSingle();
      if (error) throw error;
      const settings = data ?? defaultSettings;
      const runtime = await runtimeReadiness(admin, settings.provider);
      return json({ ok: true, data: settings, runtime }, 200, req);
    }

    if (action === "save") {
      const input = req.method === "PUT"
        ? await req.json().catch(() => null)
        : body.settings;
      const settings = validateSettings(input);
      const runtime = await runtimeReadiness(admin, settings.provider);
      if (settings.enabled && !runtime.runtime_ready) {
        return json(
          {
            ok: false,
            error:
              "Le runtime télécom n’est pas prêt. Complétez les secrets serveur et activez le worker de reprise avant d’activer le service.",
            runtime,
          },
          409,
          req,
        );
      }
      const { data: current, error: readError } = await admin
        .from("waouh_tel_settings")
        .select("native_groups_enabled,enabled,business_phone_e164,provider")
        .eq("key", "default")
        .maybeSingle();
      if (readError) throw readError;
      if (
        current?.enabled === true && settings.enabled === true &&
        (current.business_phone_e164 !== settings.business_phone_e164 ||
          current.provider !== settings.provider)
      ) {
        return json(
          {
            ok: false,
            error:
              "Désactivez d’abord le service avant de changer son numéro ou son fournisseur.",
            runtime,
          },
          409,
          req,
        );
      }

      const { data, error } = await admin
        .from("waouh_tel_settings")
        .upsert({
          key: "default",
          ...settings,
          native_groups_enabled: current?.native_groups_enabled === true &&
            settings.rcs_enabled,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" })
        .select(
          "key,business_phone_e164,business_phone_display,rcs_sender_name,provider,default_country_code,enabled,sms_enabled,rcs_enabled,virtual_groups_enabled,native_groups_enabled,updated_at,updated_by",
        )
        .single();
      if (error) throw error;
      return json({ ok: true, data, runtime }, 200, req);
    }

    return json({ ok: false, error: "Action inconnue." }, 400, req);
  } catch (error) {
    if (error instanceof TypeError) {
      return json({ ok: false, error: error.message }, 400, req);
    }
    console.error("[waouh-native-messaging-settings]", error);
    return json(
      {
        ok: false,
        error: "Impossible de gérer les paramètres Native Messaging.",
      },
      500,
      req,
    );
  }
});
