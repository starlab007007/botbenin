import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const actions = new Set([
  "create",
  "start",
  "status",
  "qr",
  "pair-code",
  "stop",
  "delete",
]);

type Action =
  | "create"
  | "start"
  | "status"
  | "qr"
  | "pair-code"
  | "stop"
  | "delete";

type RequestBody = {
  action?: Action;
  sessionName?: string;
  displayName?: string;
  phoneNumber?: string;
};

type WahaCredentials = {
  baseUrl: string;
  apiKey?: string;
  basicAuthorization?: string;
};

class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const mapOf = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const textOf = (value: unknown) =>
  typeof value === "string"
    ? value.trim()
    : value == null
      ? ""
      : String(value).trim();

const cleanDisplayName = (value: unknown) =>
  textOf(value).replace(/\s+/g, " ").slice(0, 60);

const cleanSessionName = (value: unknown) =>
  textOf(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);

const cleanPhone = (value: unknown) => textOf(value).replace(/\D/g, "");

function technicalSessionName(userId: string, displayName: string) {
  const normalized = displayName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 10) || "ligne";

  const userPrefix = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 6);

  return `wa_${userPrefix}_${normalized}_${random}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

async function payloadOf(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return mapOf(await response.json());
    } catch {
      return {};
    }
  }

  if (contentType.includes("image/")) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      qr: `data:image/png;base64,${bytesToBase64(bytes)}`,
    };
  }

  const raw = await response.text();

  try {
    return mapOf(JSON.parse(raw));
  } catch {
    return { data: raw };
  }
}

function errorText(payload: Record<string, unknown>) {
  const nested = mapOf(payload.data);

  return textOf(
    payload.error ??
      payload.message ??
      nested.error ??
      nested.message ??
      payload.data,
  );
}

function extractQr(payload: Record<string, unknown>) {
  const nested = mapOf(payload.data);

  const candidate =
    payload.qrCode ??
    payload.qr ??
    payload.base64 ??
    payload.image ??
    payload.qrcode ??
    nested.qrCode ??
    nested.qr ??
    nested.base64 ??
    nested.image ??
    nested.qrcode ??
    nested.data;

  const value = textOf(candidate);

  if (!value) return null;

  if (
    value.startsWith("data:image") ||
    value.startsWith("https://") ||
    value.startsWith("http://")
  ) {
    return value;
  }

  if (/^[A-Za-z0-9+/=\r\n]+$/.test(value) && value.length > 80) {
    return `data:image/png;base64,${value.replace(/\s+/g, "")}`;
  }

  return null;
}

function extractPairCode(payload: Record<string, unknown>) {
  const nested = mapOf(payload.data);

  const candidate =
    payload.code ??
    payload.pairCode ??
    payload.pairingCode ??
    nested.code ??
    nested.pairCode ??
    nested.pairingCode;

  const value = textOf(candidate).replace(/\s+/g, "");

  return value || null;
}

function rawWahaStatus(payload: Record<string, unknown>) {
  const nested = mapOf(payload.data);

  return textOf(
    payload.status ??
      payload.state ??
      nested.status ??
      nested.state,
  ).toUpperCase();
}

function databaseStatus(payload: Record<string, unknown>) {
  const status = rawWahaStatus(payload);

  if (
    ["WORKING", "AUTHENTICATED", "READY", "CONNECTED"].includes(status)
  ) {
    return "connected";
  }

  if (["SCAN_QR_CODE", "STARTING", "CONNECTING"].includes(status)) {
    return "connecting";
  }

  if (["FAILED", "ERROR"].includes(status)) {
    return "error";
  }

  return "disconnected";
}

function phoneFromWaha(payload: Record<string, unknown>) {
  const config = mapOf(payload.config);
  const metadata = mapOf(config.metadata);
  const me = mapOf(payload.me);

  return textOf(
    metadata.phone_number ??
      metadata.account ??
      me.id,
  ) || null;
}

function studioMeta(account: Record<string, unknown>) {
  const payload = mapOf(account.waha_session_data);
  return mapOf(payload.studio_meta);
}

function packedWahaData(
  account: Record<string, unknown> | null,
  wahaData: Record<string, unknown>,
  displayName: string,
) {
  const previousMeta = account ? studioMeta(account) : {};

  return {
    ...wahaData,
    studio_meta: {
      ...previousMeta,
      display_name: displayName,
      raw_status: rawWahaStatus(wahaData) || previousMeta.raw_status || null,
      updated_at: new Date().toISOString(),
      channel: "whatsapp_ia_studio",
    },
  };
}

function accountView(account: Record<string, unknown>) {
  const meta = studioMeta(account);

  return {
    id: textOf(account.id),
    session_name: textOf(account.session_name),
    display_name:
      textOf(meta.display_name) || textOf(account.session_name),
    status: textOf(account.status),
    phone_number: account.phone_number ?? null,
    created_at: account.created_at ?? null,
  };
}

async function wahaFetch(
  credentials: WahaCredentials,
  path: string,
  init: RequestInit = {},
) {
  const inherited = Object.fromEntries(
    new Headers(init.headers).entries(),
  );

  const headersBase: Record<string, string> = {
    Accept: "application/json, image/*;q=0.9, */*;q=0.8",
    ...inherited,
  };

  if (init.body && !headersBase["Content-Type"]) {
    headersBase["Content-Type"] = "application/json";
  }

  const variants: Record<string, string>[] = [];

  if (credentials.apiKey) {
    variants.push({
      ...headersBase,
      "X-Api-Key": credentials.apiKey,
    });
  }

  if (credentials.basicAuthorization) {
    variants.push({
      ...headersBase,
      Authorization: credentials.basicAuthorization,
    });
  }

  if (credentials.apiKey && credentials.basicAuthorization) {
    variants.push({
      ...headersBase,
      "X-Api-Key": credentials.apiKey,
      Authorization: credentials.basicAuthorization,
    });
  }

  if (!variants.length) {
    throw new ApiError(
      503,
      "WAHA_NOT_CONFIGURED",
      "La connexion WAHA n’est pas configurée sur le serveur.",
    );
  }

  let lastResponse: Response | null = null;

  for (const headers of variants) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(`${credentials.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });

      lastResponse = response;

      if (![401, 403].includes(response.status)) {
        return response;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastResponse) return lastResponse;

  throw new ApiError(
    502,
    "WAHA_UNREACHABLE",
    "Le serveur WAHA ne répond pas.",
  );
}

async function getOwnedAccount(
  admin: any,
  userId: string,
  sessionName: string,
) {
  const { data, error } = await admin
    .from("whatsapp_accounts")
    .select(
      "id,user_id,session_name,status,phone_number,waha_session_data,created_at",
    )
    .eq("user_id", userId)
    .eq("session_name", sessionName)
    .maybeSingle();

  if (error) {
    throw new ApiError(
      500,
      "ACCOUNT_LOOKUP_FAILED",
      "Lecture de la ligne WhatsApp impossible.",
    );
  }

  if (!data) {
    throw new ApiError(
      403,
      "SESSION_NOT_OWNED",
      "Cette ligne WhatsApp ne vous appartient pas ou n’existe plus.",
    );
  }

  return mapOf(data);
}

async function updateAccount(
  admin: any,
  account: Record<string, unknown>,
  changes: Record<string, unknown>,
) {
  const { data, error } = await admin
    .from("whatsapp_accounts")
    .update({
      ...changes,
      last_activity: new Date().toISOString(),
    })
    .eq("id", textOf(account.id))
    .eq("user_id", textOf(account.user_id))
    .select(
      "id,user_id,session_name,status,phone_number,waha_session_data,created_at",
    )
    .single();

  if (error || !data) {
    throw new ApiError(
      500,
      "ACCOUNT_UPDATE_FAILED",
      "Mise à jour de la ligne WhatsApp impossible.",
    );
  }

  return mapOf(data);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(
      {
        success: false,
        code: "METHOD_NOT_ALLOWED",
        error: "Méthode non autorisée.",
      },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new ApiError(
        503,
        "SUPABASE_NOT_CONFIGURED",
        "Configuration Supabase incomplète pour WhatsApp IA.",
      );
    }

    const authorization = req.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      throw new ApiError(
        401,
        "UNAUTHORIZED",
        "Connexion utilisateur requise.",
      );
    }

    const requester = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: userData, error: userError } =
      await requester.auth.getUser(token);

    if (userError || !userData.user) {
      throw new ApiError(
        401,
        "UNAUTHORIZED",
        "Session utilisateur invalide.",
      );
    }

    const user = userData.user;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({})) as RequestBody;
    const action = textOf(body.action) as Action;

    if (!actions.has(action)) {
      throw new ApiError(
        400,
        "INVALID_ACTION",
        "Action WhatsApp IA invalide.",
      );
    }

    const rawApiKey =
      Deno.env.get("WAHA_API_KEY_PLAIN")?.trim() ||
      Deno.env.get("WAHA_API_KEY")?.trim() ||
      "";

    const apiKey =
      rawApiKey && !rawApiKey.startsWith("sha512:")
        ? rawApiKey
        : undefined;

    const dashboardUser =
      Deno.env.get("WAHA_DASHBOARD_USERNAME")?.trim() || "";
    const dashboardPassword =
      Deno.env.get("WAHA_DASHBOARD_PASSWORD")?.trim() || "";

    const credentials: WahaCredentials = {
      baseUrl: (Deno.env.get("WAHA_BASE_URL") || "https://waha.bot.bj")
        .replace(/\/$/, "")
        .replace(/\/dashboard$/, ""),
      apiKey,
      basicAuthorization:
        dashboardUser && dashboardPassword
          ? `Basic ${btoa(`${dashboardUser}:${dashboardPassword}`)}`
          : undefined,
    };

    if (!credentials.apiKey && !credentials.basicAuthorization) {
      throw new ApiError(
        503,
        "WAHA_NOT_CONFIGURED",
        "Les accès WAHA ne sont pas configurés dans Supabase Secrets.",
      );
    }

    if (action === "create") {
      const displayName = cleanDisplayName(
        body.displayName || body.sessionName,
      );

      if (!displayName) {
        throw new ApiError(
          400,
          "INVALID_DISPLAY_NAME",
          "Donnez un nom à votre ligne WhatsApp.",
        );
      }

      const sessionName = technicalSessionName(user.id, displayName);
      const webhookToken = crypto.randomUUID().replace(/-/g, "");
      const webhookUrl =
        `${supabaseUrl}/functions/v1/waha-studio-webhook?token=${webhookToken}`;

      const candidates = [
        "/api/sessions",
        "/api/v2/sessions",
      ];

      let createdPayload: Record<string, unknown> | null = null;
      let lastError = "";

      for (const path of candidates) {
        const response = await wahaFetch(credentials, path, {
          method: "POST",
          body: JSON.stringify({
            name: sessionName,
            config: {
              webhooks: [
                {
                  url: webhookUrl,
                  events: [
                    "message",
                    "message.any",
                    "message.ack",
                    "message.reaction",
                    "session.status",
                  ],
                },
              ],
            },
          }),
        });

        const payload = await payloadOf(response);

        if (response.ok || response.status === 201) {
          createdPayload = payload;
          break;
        }

        lastError = `${path} (${response.status}) ${errorText(payload)}`;
      }

      if (!createdPayload) {
        throw new ApiError(
          502,
          "WAHA_CREATE_FAILED",
          `Création de la ligne WAHA impossible. ${lastError}`,
        );
      }

      const wahaData: Record<string, any> = packedWahaData(
        null,
        createdPayload,
        displayName,
      );

      wahaData["studio_meta"] = {
        ...mapOf(wahaData["studio_meta"]),
        webhook_token: webhookToken,
      };

      const { data, error } = await admin
        .from("whatsapp_accounts")
        .upsert(
          {
            user_id: user.id,
            session_name: sessionName,
            status: databaseStatus(createdPayload),
            phone_number: phoneFromWaha(createdPayload),
            webhook_url: webhookUrl,
            waha_session_data: wahaData,
            last_activity: new Date().toISOString(),
          },
          {
            onConflict: "user_id,session_name",
          },
        )
        .select(
          "id,user_id,session_name,status,phone_number,waha_session_data,created_at",
        )
        .single();

      if (error || !data) {
        throw new ApiError(
          500,
          "ACCOUNT_CREATE_FAILED",
          "La ligne WAHA a été créée mais son enregistrement est impossible.",
        );
      }

      return json({
        success: true,
        account: accountView(mapOf(data)),
      });
    }

    const sessionName = cleanSessionName(body.sessionName);

    if (!sessionName) {
      throw new ApiError(
        400,
        "INVALID_SESSION",
        "Session WhatsApp invalide.",
      );
    }

    const account = await getOwnedAccount(admin, user.id, sessionName);
    const displayName =
      textOf(studioMeta(account).display_name) || sessionName;

    if (action === "start") {
      const candidates = [
        `/api/sessions/${encodeURIComponent(sessionName)}/start`,
        `/api/v2/sessions/${encodeURIComponent(sessionName)}/start`,
      ];

      let payload: Record<string, unknown> | null = null;
      let lastError = "";

      for (const path of candidates) {
        const response = await wahaFetch(credentials, path, {
          method: "POST",
          body: JSON.stringify({}),
        });

        const candidate = await payloadOf(response);

        if (response.ok || response.status === 409) {
          payload = candidate;
          break;
        }

        lastError = `${path} (${response.status}) ${errorText(candidate)}`;
      }

      if (!payload) {
        throw new ApiError(
          502,
          "WAHA_START_FAILED",
          `Démarrage WAHA impossible. ${lastError}`,
        );
      }

      const updated = await updateAccount(admin, account, {
        status: "connecting",
        waha_session_data: packedWahaData(account, payload, displayName),
      });

      return json({
        success: true,
        account: accountView(updated),
      });
    }

    if (action === "status") {
      const candidates = [
        `/api/sessions/${encodeURIComponent(sessionName)}`,
        `/api/v2/sessions/${encodeURIComponent(sessionName)}`,
      ];

      let payload: Record<string, unknown> | null = null;
      let lastError = "";

      for (const path of candidates) {
        const response = await wahaFetch(credentials, path, {
          method: "GET",
        });

        const candidate = await payloadOf(response);

        if (response.ok) {
          payload = candidate;
          break;
        }

        lastError = `${path} (${response.status}) ${errorText(candidate)}`;
      }

      if (!payload) {
        throw new ApiError(
          502,
          "WAHA_STATUS_FAILED",
          `Lecture du statut WAHA impossible. ${lastError}`,
        );
      }

      const updated = await updateAccount(admin, account, {
        status: databaseStatus(payload),
        phone_number: phoneFromWaha(payload),
        waha_session_data: packedWahaData(account, payload, displayName),
      });

      return json({
        success: true,
        account: accountView(updated),
        waha_status: rawWahaStatus(payload),
      });
    }

    if (action === "qr") {
      const candidates: Array<{
        path: string;
        method: "GET" | "POST";
        headers?: Record<string, string>;
      }> = [
        // Official WAHA endpoint. JSON response is preferred because Flutter
        // can render the returned base64 payload without exposing WAHA directly.
        {
          path: `/api/${encodeURIComponent(sessionName)}/auth/qr`,
          method: "GET",
          headers: {"Accept": "application/json"},
        },
        // Some WAHA deployments return a binary PNG for the same endpoint.
        {
          path: `/api/${encodeURIComponent(sessionName)}/auth/qr`,
          method: "GET",
          headers: {"Accept": "image/png"},
        },
        // Backward-compatible fallbacks for older WAHA deployments.
        {
          path: `/api/${encodeURIComponent(sessionName)}/auth/qr?format=base64`,
          method: "GET",
          headers: {"Accept": "application/json"},
        },
        {
          path: `/api/v2/${encodeURIComponent(sessionName)}/auth/qr`,
          method: "GET",
          headers: {"Accept": "application/json"},
        },
        {
          path: `/api/sessions/${encodeURIComponent(sessionName)}/auth/qr?format=base64`,
          method: "GET",
          headers: {"Accept": "application/json"},
        },
        {
          path: `/api/sessions/${encodeURIComponent(sessionName)}/qr?format=base64`,
          method: "GET",
          headers: {"Accept": "application/json"},
        },
      ];

      let qrCode: string | null = null;
      let payload: Record<string, unknown> = {};
      let lastError = "";

      for (const candidate of candidates) {
        const response = await wahaFetch(credentials, candidate.path, {
          method: candidate.method,
          headers: candidate.headers,
          ...(candidate.method === "POST"
            ? { body: JSON.stringify({}) }
            : {}),
        });

        const current = await payloadOf(response);
        const currentQr = response.ok ? extractQr(current) : null;

        if (currentQr) {
          qrCode = currentQr;
          payload = current;
          break;
        }

        lastError =
          `${candidate.path} (${response.status}) ${errorText(current)}`;
      }

      if (!qrCode) {
        throw new ApiError(
          502,
          "QR_UNAVAILABLE",
          `QR Code indisponible. ${lastError}`,
        );
      }

      const updated = await updateAccount(admin, account, {
        status: "connecting",
        qr_code: qrCode,
        waha_session_data: packedWahaData(account, payload, displayName),
      });

      return json({
        success: true,
        account: accountView(updated),
        qrCode,
      });
    }

    if (action === "pair-code") {
      const phoneNumber = cleanPhone(body.phoneNumber);

      if (phoneNumber.length < 8) {
        throw new ApiError(
          400,
          "INVALID_PHONE",
          "Utilisez un numéro WhatsApp au format international.",
        );
      }

      const candidates = [
        {
          path: `/api/${encodeURIComponent(sessionName)}/auth/request-code`,
          body: { phoneNumber },
        },
        {
          path: `/api/${encodeURIComponent(sessionName)}/auth/request-code`,
          body: { phone: phoneNumber },
        },
        {
          path: `/api/v2/${encodeURIComponent(sessionName)}/auth/request-code`,
          body: { phoneNumber },
        },
        {
          path: `/api/sessions/${encodeURIComponent(sessionName)}/auth/request-code`,
          body: { phoneNumber },
        },
      ];

      let code: string | null = null;
      let expiresIn = 300;
      let lastError = "";

      for (const candidate of candidates) {
        const response = await wahaFetch(credentials, candidate.path, {
          method: "POST",
          body: JSON.stringify(candidate.body),
        });

        const payload = await payloadOf(response);
        const currentCode = response.ok ? extractPairCode(payload) : null;

        if (currentCode) {
          code = currentCode;

          const nested = mapOf(payload.data);
          const rawExpires =
            payload.expires_in ??
            payload.expiresIn ??
            nested.expires_in ??
            nested.expiresIn;

          expiresIn = Number.isFinite(Number(rawExpires))
            ? Number(rawExpires)
            : 300;

          break;
        }

        lastError =
          `${candidate.path} (${response.status}) ${errorText(payload)}`;
      }

      if (!code) {
        throw new ApiError(
          501,
          "PAIR_CODE_UNAVAILABLE",
          "Le code de liaison n’est pas disponible sur ce serveur WAHA. Utilisez le QR Code.",
        );
      }

      const updated = await updateAccount(admin, account, {
        status: "connecting",
      });

      return json({
        success: true,
        account: accountView(updated),
        code,
        expires_in: expiresIn,
      });
    }

    if (action === "stop") {
      const candidates = [
        `/api/sessions/${encodeURIComponent(sessionName)}/stop`,
        `/api/v2/sessions/${encodeURIComponent(sessionName)}/stop`,
      ];

      let stopped = false;
      let lastError = "";

      for (const path of candidates) {
        const response = await wahaFetch(credentials, path, {
          method: "POST",
          body: JSON.stringify({}),
        });

        const payload = await payloadOf(response);

        if (response.ok) {
          stopped = true;
          break;
        }

        lastError = `${path} (${response.status}) ${errorText(payload)}`;
      }

      if (!stopped) {
        throw new ApiError(
          502,
          "WAHA_STOP_FAILED",
          `Arrêt WAHA impossible. ${lastError}`,
        );
      }

      const updated = await updateAccount(admin, account, {
        status: "disconnected",
        qr_code: null,
      });

      return json({
        success: true,
        account: accountView(updated),
      });
    }

    if (action === "delete") {
      const candidates = [
        `/api/sessions/${encodeURIComponent(sessionName)}`,
        `/api/v2/sessions/${encodeURIComponent(sessionName)}`,
      ];

      let removed = false;
      let lastError = "";

      for (const path of candidates) {
        const response = await wahaFetch(credentials, path, {
          method: "DELETE",
        });

        const payload = await payloadOf(response);

        if (response.ok || response.status === 404) {
          removed = true;
          break;
        }

        lastError = `${path} (${response.status}) ${errorText(payload)}`;
      }

      if (!removed) {
        throw new ApiError(
          502,
          "WAHA_DELETE_FAILED",
          `Suppression WAHA impossible. ${lastError}`,
        );
      }

      const { error } = await admin
        .from("whatsapp_accounts")
        .delete()
        .eq("id", textOf(account.id))
        .eq("user_id", user.id);

      if (error) {
        throw new ApiError(
          500,
          "ACCOUNT_DELETE_FAILED",
          "La session WAHA est supprimée mais la suppression locale a échoué.",
        );
      }

      return json({ success: true });
    }

    throw new ApiError(
      400,
      "INVALID_ACTION",
      "Action WhatsApp IA invalide.",
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return json(
        {
          success: false,
          code: error.code,
          error: error.message,
        },
        error.status,
      );
    }

    console.error("waha-session-mobile", error);

    return json(
      {
        success: false,
        code: "UNEXPECTED_ERROR",
        error: "Erreur inattendue du service WhatsApp IA.",
      },
      500,
    );
  }
});
