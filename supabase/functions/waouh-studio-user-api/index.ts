import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const STUDIO_API_VERSION = "21.4.6.24";
const PAIR_CODE_ENDPOINT_TEMPLATE =
  "/api/{session}/auth/request-code";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Json = Record<string, unknown>;

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function response(
  body: Json,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "X-Waouh-Studio-Version": STUDIO_API_VERSION,
      },
    },
  );
}

function cleanText(
  value: unknown,
  max = 240,
): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "ligne";
}

function publicAgentBaseUrl(): string {
  const configured = cleanText(
    Deno.env.get("AGENT_PUBLIC_BASE_URL"),
    600,
  ).replace(/\/+$/, "");

  return configured || "https://bot.bj";
}

function publicAgentQrUrl(slugValue: string): string {
  const apiBase = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/a`;
  return `${apiBase}/${encodeURIComponent(slugValue)}?qr=1`;
}

function randomPublicSlug(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return [...bytes]
    .map((value) => alphabet[value % alphabet.length])
    .join("");
}

function agentPublicShare(agent: any): Json {
  return asMap(asMap(agent?.capabilities)["public_share"]);
}

async function uniquePublicSlug(service: any): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = randomPublicSlug();
    const { data, error } = await service
      .from("waouh_ai_agents")
      .select("id")
      .contains("capabilities", {
        public_share: { slug: candidate },
      })
      .limit(1);

    if (error) throw error;
    if (!data?.length) return candidate;
  }

  throw new Error("Impossible de générer un lien public unique.");
}

async function ensureAgentPublicShare(
  service: any,
  userId: string,
  agent: any,
  options: {
    enabled?: boolean;
    regenerate?: boolean;
  } = {},
) {
  const capabilities = {
    ...asMap(agent?.capabilities),
  };
  const current = agentPublicShare(agent);
  const regenerate = options.regenerate === true;
  const slugValue = !regenerate && cleanText(current["slug"], 80)
    ? cleanText(current["slug"], 80)
    : await uniquePublicSlug(service);
  const now = new Date().toISOString();
  const enabled = options.enabled ??
    (current["enabled"] === false ? false : true);
  const publicUrl = `${publicAgentBaseUrl()}/${encodeURIComponent(slugValue)}`;

  const share: Json = {
    slug: slugValue,
    enabled,
    public_url: publicUrl,
    qr_url: publicAgentQrUrl(slugValue),
    created_at: cleanText(current["created_at"], 80) || now,
    updated_at: now,
    version: STUDIO_API_VERSION,
  };

  capabilities["public_share"] = share;

  const { data, error } = await service
    .from("waouh_ai_agents")
    .update({
      capabilities,
      updated_at: now,
    })
    .eq("id", agent.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return {
    agent: data,
    share,
  };
}

function asMap(value: unknown): Json {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Json;
  }

  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String((error as { message: unknown }).message);
  }

  return "Opération impossible.";
}

function wahaErrorDescriptor(
  status: number,
  message: string,
): { code: string; status: number; message: string } {
  const value = message.toLowerCase();

  if (status === 404 ||
      value.includes("not found") ||
      value.includes("unknown session") ||
      value.includes("does not exist")) {
    return {
      code: "SESSION_NOT_FOUND",
      status: 404,
      message:
        "Cette session n’existe plus dans WAHA.",
    };
  }

  if (value.includes("invalid phone") ||
      value.includes("phone number") ||
      value.includes("e.164") ||
      value.includes("e164")) {
    return {
      code: "INVALID_PHONE",
      status: 422,
      message:
        "Le numéro WhatsApp est incorrect.",
    };
  }

  if (value.includes("not authenticated") ||
      value.includes("not logged") ||
      value.includes("logged out") ||
      value.includes("scan_qr")) {
    return {
      code: "SESSION_DISCONNECTED",
      status: 409,
      message:
        "La session WhatsApp est déconnectée.",
    };
  }

  if (value.includes("stopped")) {
    return {
      code: "SESSION_STOPPED",
      status: 409,
      message:
        "La session WhatsApp est arrêtée.",
    };
  }

  if (status === 401 || status === 403) {
    return {
      code: "WAHA_AUTH_ERROR",
      status: 502,
      message:
        "Le serveur WhatsApp refuse l’authentification.",
    };
  }

  if (status === 408 || value.includes("timeout")) {
    return {
      code: "WAHA_TIMEOUT",
      status: 504,
      message:
        "Le serveur WhatsApp met trop de temps à répondre.",
    };
  }

  return {
    code: "WAHA_UNREACHABLE",
    status: status >= 500 ? status : 502,
    message: message ||
      "Le serveur WhatsApp est momentanément indisponible.",
  };
}

function throwWahaResult(result: Json): never {
  const descriptor = wahaErrorDescriptor(
    Number(result["_status"] ?? 502),
    String(result["error"] ?? result["message"] ?? ""),
  );

  throw Object.assign(
    new Error(descriptor.message),
    {
      code: String(result["code"] ?? descriptor.code),
      status: Number(result["http_status"] ?? descriptor.status),
    },
  );
}

function safeFilename(value: string): string {
  return value
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .slice(0, 120) || "fichier";
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;

  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, index + chunk),
    );
  }

  return btoa(binary);
}

async function readJson(request: Request): Promise<Json> {
  try {
    return asMap(await request.json());
  } catch {
    return {};
  }
}

async function authenticatedContext(request: Request) {
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw Object.assign(
      new Error("Connectez-vous pour continuer."),
      { code: "AUTH_REQUIRED", status: 401 },
    );
  }

  const userClient = createClient(
    supabaseUrl,
    anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser(token);

  if (error || !user) {
    throw Object.assign(
      new Error("Votre session a expiré. Reconnectez-vous."),
      { code: "INVALID_TOKEN", status: 401 },
    );
  }

  const service = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return {
    user,
    userClient,
    service,
    token,
  };
}

async function internalFunction(
  functionName: string,
  body: Json,
  bearer: string = serviceRoleKey,
): Promise<Json> {
  const result = await fetch(
    `${supabaseUrl}/functions/v1/${functionName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey:
          bearer === serviceRoleKey
            ? serviceRoleKey
            : anonKey,
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(body),
    },
  );

  let data: Json = {};

  try {
    data = asMap(await result.json());
  } catch {
    data = {};
  }

  return {
    ...data,
    _status: result.status,
    _ok: result.ok,
  };
}

function wahaBaseUrl(): string {
  return (
    Deno.env.get("WAHA_API_URL") ??
    Deno.env.get("WAHA_BASE_URL") ??
    Deno.env.get("WAHA_URL") ??
    ""
  )
    .replace(/\/+$/, "")
    .replace(/\/(dashboard|swagger)$/i, "")
    .replace(/\/api$/i, "");
}

function wahaApiKey(): string {
  return (
    Deno.env.get("WAHA_API_KEY_PLAIN") ??
    Deno.env.get("WAHA_API_KEY") ??
    ""
  ).trim();
}

function wahaHeaderVariants(): Record<string, string>[] {
  const key = wahaApiKey();

  if (!key) {
    return [
      {
        "Content-Type": "application/json",
        Accept: "application/json, image/*;q=0.9, */*;q=0.8",
      },
    ];
  }

  return [
    {
      "Content-Type": "application/json",
      Accept: "application/json, image/*;q=0.9, */*;q=0.8",
      "X-Api-Key": key,
    },
  ];
}

function wahaStatus(value: unknown): string {
  const candidates: string[] = [];

  const visit = (
    current: unknown,
    depth = 0,
  ) => {
    if (depth > 4 || current == null) return;

    if (Array.isArray(current)) {
      for (const item of current.slice(0, 8)) {
        visit(item, depth + 1);
      }
      return;
    }

    if (typeof current !== "object") {
      return;
    }

    const data = current as Record<string, unknown>;

    for (const key of [
      "status",
      "state",
      "connectionStatus",
      "connection_state",
      "authStatus",
      "auth_state",
    ]) {
      const candidate = cleanText(data[key], 80);

      if (candidate) {
        candidates.push(candidate.toUpperCase());
      }
    }

    for (const key of [
      "data",
      "session",
      "engine",
      "auth",
      "connection",
      "items",
    ]) {
      visit(data[key], depth + 1);
    }
  };

  visit(value);

  for (const raw of candidates) {
    switch (raw) {
      case "WORKING":
      case "CONNECTED":
      case "READY":
      case "ONLINE":
      case "AUTHENTICATED":
        return "connected";
      case "STOPPED":
        return "stopped";
      case "STARTING":
      case "INITIALIZING":
        return "starting";
      case "SCAN_QR_CODE":
      case "SCAN_QR":
      case "QRCODE":
        return "connecting";
      case "PASSKEY_REQUIRED":
      case "PASSKEY_CONFIRMATION_REQUIRED":
      case "PAIRING":
        return "pairing";
      case "LOGGED_OUT":
      case "DISCONNECTED":
        return "disconnected";
      case "FAILED":
      case "ERROR":
        return "failed";
      default:
        break;
    }
  }

  const raw = candidates[0] ?? "PENDING";
  return raw.toLowerCase();
}

function studioWebhookUrl(): string {
  return `${supabaseUrl}/functions/v1/waha-webhook`;
}

function requiredWebhookEvents(): string[] {
  return [
    "message",
    "message.ack",
    "session.status",
  ];
}

function studioSessionConfig(
  current: unknown,
  metadata?: Json,
): Json {
  const config = {
    ...asMap(current),
  };
  const webhookUrl = studioWebhookUrl();
  const required = requiredWebhookEvents();

  const existing = asArray(config["webhooks"])
    .map(asMap)
    .filter((item) => Object.keys(item).length > 0);

  const otherWebhooks = existing.filter(
    (item) => cleanText(item["url"], 500) !== webhookUrl,
  );

  config["webhooks"] = [
    ...otherWebhooks,
    {
      url: webhookUrl,
      events: required,
      retries: {
        policy: "linear",
        delaySeconds: 2,
        attempts: 6,
      },
    },
  ];

  if (metadata && Object.keys(metadata).length > 0) {
    config["metadata"] = {
      ...asMap(config["metadata"]),
      ...metadata,
    };
  }

  return config;
}

function hasStudioWebhook(value: unknown): boolean {
  const data = asMap(value);
  const config = asMap(data["config"]);
  const expectedUrl = studioWebhookUrl();
  const expectedEvents = requiredWebhookEvents();

  return asArray(config["webhooks"])
    .map(asMap)
    .some((item) => {
      if (cleanText(item["url"], 500) !== expectedUrl) {
        return false;
      }

      const events = asArray(item["events"]).map(String);

      return expectedEvents.every(
        (event) => events.includes(event),
      );
    });
}

function isMissingWahaRoute(
  method: string,
  status: number,
  message: string,
): boolean {
  const value = message.toLowerCase();
  const verb = method.toLowerCase();

  return status === 405 ||
    value.includes(`cannot ${verb}`) ||
    value.includes(`cannot ${method.toUpperCase()}`.toLowerCase()) ||
    value.includes("route not found") ||
    value.includes("endpoint not found");
}

type WahaRequestOptions = {
  timeoutMs?: number;
};

async function wahaRequest(
  method: string,
  paths: string[],
  body?: Json,
  options: WahaRequestOptions = {},
): Promise<Json> {
  const base = wahaBaseUrl();

  if (!base) {
    return {
      success: false,
      _status: 500,
      code: "WAHA_CONFIG_MISSING",
      http_status: 503,
      error:
        "La configuration WAHA est absente du backend.",
    };
  }

  let lastError = "WAHA n’a pas répondu.";
  let lastStatus = 502;
  let lastPath = paths[0] ?? "";

  for (const path of paths) {
    lastPath = path;
    let missingRoute = false;

    for (const headers of wahaHeaderVariants()) {
      const controller = new AbortController();
      const timeoutMs = Math.min(
        Math.max(Number(options.timeoutMs ?? 15_000), 1_500),
        30_000,
      );
      const timeout = setTimeout(
        () => controller.abort(),
        timeoutMs,
      );

      try {
        const result = await fetch(
          `${base}${path}`,
          {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          },
        );

        const contentType =
          result.headers.get("content-type") ?? "";

        if (
          result.ok &&
          contentType.toLowerCase().startsWith("image/")
        ) {
          const bytes = new Uint8Array(
            await result.arrayBuffer(),
          );

          return {
            success: true,
            _status: result.status,
            _path: path,
            qrCode:
              `data:${contentType};base64,${encodeBase64(bytes)}`,
          };
        }

        let data: Json = {};
        let raw = "";
        let bodyReadError = "";

        try {
          raw = await result.text();
        } catch (error) {
          bodyReadError = normalizeError(error);
        }

        if (raw) {
          try {
            const parsed = JSON.parse(raw);

            data = Array.isArray(parsed)
              ? {
                  data: parsed,
                  items: parsed,
                }
              : asMap(parsed);
          } catch {
            data = { message: raw };
          }
        }

        if (result.ok) {
          return {
            success: true,
            _status: result.status,
            _path: path,
            ...(bodyReadError
              ? {
                  body_unavailable: true,
                  body_read_error: bodyReadError,
                }
              : {}),
            ...data,
          };
        }

        lastStatus = result.status;
        lastError = String(
          data["message"] ??
          data["error"] ??
          data["detail"] ??
          (
            bodyReadError ||
            `WAHA HTTP ${result.status}`
          ),
        );

        // Try another authentication style only for auth errors.
        if (result.status === 401 || result.status === 403) {
          continue;
        }

        // Try another URL only when this endpoint truly does not exist.
        missingRoute = isMissingWahaRoute(
          method,
          result.status,
          lastError,
        );

        if (missingRoute) {
          break;
        }

        // The endpoint exists: preserve its meaningful business error
        // instead of replacing it with a later "Cannot POST" response.
        const descriptor = wahaErrorDescriptor(
          lastStatus,
          lastError,
        );

        return {
          success: false,
          _status: lastStatus,
          _path: path,
          http_status: descriptor.status,
          code: descriptor.code,
          error: descriptor.message,
          technical_error: lastError,
        };
      } catch (error) {
        const name = error instanceof Error
          ? error.name
          : "";

        if (name === "AbortError") {
          lastError = "WAHA timeout";
          lastStatus = 408;
        } else {
          lastError = normalizeError(error);
          lastStatus = 502;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!missingRoute && lastStatus !== 401 && lastStatus !== 403) {
      break;
    }
  }

  const descriptor = wahaErrorDescriptor(
    lastStatus,
    lastError,
  );

  return {
    success: false,
    _status: lastStatus,
    _path: lastPath,
    http_status: descriptor.status,
    code: descriptor.code,
    error: descriptor.message,
    technical_error: lastError,
  };
}

async function ensureSessionWebhook(
  sessionName: string,
  timeoutMs = 15_000,
): Promise<Json> {
  const encoded = encodeURIComponent(sessionName);
  const current = await wahaRequest(
    "GET",
    [
      `/api/sessions/${encoded}`,
    ],
    undefined,
    { timeoutMs },
  );

  if (current["success"] === false) {
    return current;
  }

  if (hasStudioWebhook(current)) {
    return {
      success: true,
      webhook_configured: true,
      webhook_updated: false,
      status: wahaStatus(current),
      session: current,
    };
  }

  const config = studioSessionConfig(
    current["config"],
  );

  const updated = await wahaRequest(
    "PUT",
    [
      `/api/sessions/${encoded}`,
    ],
    {
      name: sessionName,
      config,
    },
    { timeoutMs },
  );

  if (updated["success"] === false) {
    return updated;
  }

  return {
    success: true,
    webhook_configured: true,
    webhook_updated: true,
    status: wahaStatus(updated),
    session: updated,
  };
}

async function sessionRow(
  service: ReturnType<typeof createClient>,
  userId: string,
  sessionName: string,
) {
  const { data, error } = await service
    .from("whatsapp_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("session_name", sessionName)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw Object.assign(
      new Error(
        "Cette session n’existe pas ou a déjà été supprimée.",
      ),
      { code: "SESSION_NOT_FOUND", status: 404 },
    );
  }

  return data as Json;
}

async function agentRow(
  service: ReturnType<typeof createClient>,
  userId: string,
  agentId: string,
) {
  const { data, error } = await service
    .from("waouh_ai_agents")
    .select("*")
    .eq("user_id", userId)
    .eq("id", agentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw Object.assign(
      new Error("Cet agent IA ne vous appartient pas."),
      { code: "FORBIDDEN", status: 403 },
    );
  }

  return data as Json;
}

const WHATSAPP_ACCOUNT_ALLOWED_STATUSES = new Set([
  "disconnected",
  "connecting",
  "connected",
  "error",
  "WORKING",
  "SCAN_QR_CODE",
  "DISCONNECTED",
  "STARTING",
  "STOPPED",
  "FAILED",
  "UNKNOWN",
  "NOT_FOUND",
]);

function whatsappAccountStatus(
  value: unknown,
): string {
  const raw = String(value ?? "")
    .trim();

  if (WHATSAPP_ACCOUNT_ALLOWED_STATUSES.has(raw)) {
    return raw;
  }

  const upper = raw.toUpperCase();

  if (WHATSAPP_ACCOUNT_ALLOWED_STATUSES.has(upper)) {
    return upper;
  }

  const lower = raw.toLowerCase();

  if (
    [
      "pairing",
      "pending",
      "scan_qr",
      "scan_qr_code",
      "starting",
    ].includes(lower)
  ) {
    return lower === "scan_qr_code"
      ? "SCAN_QR_CODE"
      : lower === "starting"
        ? "STARTING"
        : "connecting";
  }

  if (
    [
      "working",
      "ready",
      "online",
      "authenticated",
    ].includes(lower)
  ) {
    return "connected";
  }

  if (
    [
      "stopped",
      "stop",
    ].includes(lower)
  ) {
    return "STOPPED";
  }

  if (
    [
      "failed",
      "failure",
    ].includes(lower)
  ) {
    return "FAILED";
  }

  if (
    [
      "not_found",
      "not found",
      "missing",
      "deleted",
    ].includes(lower)
  ) {
    return "NOT_FOUND";
  }

  if (
    [
      "disconnected",
      "logged_out",
      "logout",
    ].includes(lower)
  ) {
    return "disconnected";
  }

  if (
    [
      "connected",
    ].includes(lower)
  ) {
    return "connected";
  }

  if (
    [
      "error",
      "unreachable",
    ].includes(lower)
  ) {
    return "error";
  }

  return "UNKNOWN";
}

async function updateSessionStatus(
  service: ReturnType<typeof createClient>,
  userId: string,
  sessionName: string,
  status: string,
) {
  const normalizedStatus =
    whatsappAccountStatus(status);

  const { error } = await service
    .from("whatsapp_accounts")
    .update({
      status: normalizedStatus,
      last_activity: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("session_name", sessionName);

  if (error) throw error;
}

async function appendAgentHistory(
  service: ReturnType<typeof createClient>,
  userId: string,
  agentId: string,
  action: string,
  message: string,
) {
  const agent = await agentRow(
    service,
    userId,
    agentId,
  );

  const capabilities = asMap(agent["capabilities"]);
  const history = asArray(
    capabilities["studio_history"],
  )
    .map(asMap)
    .filter((item) => Object.keys(item).length > 0);

  history.unshift({
    id: crypto.randomUUID(),
    action,
    message,
    agent_id: agentId,
    kind: "agent",
    created_at: new Date().toISOString(),
  });

  capabilities["studio_history"] = history.slice(0, 100);

  await service
    .from("waouh_ai_agents")
    .update({
      capabilities,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId)
    .eq("user_id", userId);
}

async function updateAgentCapabilities(
  service: ReturnType<typeof createClient>,
  userId: string,
  agentId: string,
  mutate: (capabilities: Json) => Json,
) {
  const agent = await agentRow(
    service,
    userId,
    agentId,
  );

  const capabilities = mutate(
    asMap(agent["capabilities"]),
  );

  const { error } = await service
    .from("waouh_ai_agents")
    .update({
      capabilities,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return capabilities;
}

async function sessionLabels(
  service: ReturnType<typeof createClient>,
  userId: string,
): Promise<Json> {
  const { data, error } = await service.auth.admin.getUserById(
    userId,
  );

  if (error || !data.user) {
    return {};
  }

  return asMap(
    asMap(data.user.user_metadata)["waouh_session_labels"],
  );
}

async function saveSessionLabels(
  service: ReturnType<typeof createClient>,
  userId: string,
  labels: Json,
) {
  const { data, error } = await service.auth.admin.getUserById(
    userId,
  );

  if (error || !data.user) {
    throw error ?? new Error("Utilisateur introuvable.");
  }

  const metadata = asMap(data.user.user_metadata);
  metadata["waouh_session_labels"] = labels;

  const updated = await service.auth.admin.updateUserById(
    userId,
    { user_metadata: metadata },
  );

  if (updated.error) {
    throw updated.error;
  }
}

async function ownedPartnerContext(
  service: ReturnType<typeof createClient>,
  userId: string,
) {
  // Le propriétaire réel du module Partenaire est porté par
  // waouh_partners.user_id. Les entreprises et les produits héritent ensuite
  // de cette propriété via partner_id. Ne jamais supposer la présence d'un
  // user_id direct sur waouh_partner_businesses/waouh_partner_products.
  const partnersResult = await service
    .from("waouh_partners")
    .select("id,nom,user_id,statut")
    .eq("user_id", userId);

  if (partnersResult.error) throw partnersResult.error;

  const partners = (partnersResult.data ?? []) as Json[];
  const partnerIds = partners
    .map((item) => cleanText(item["id"], 80))
    .filter(Boolean);

  const businesses: Json[] = [];
  if (partnerIds.length > 0) {
    const businessesResult = await service
      .from("waouh_partner_businesses")
      .select("id,partner_id,nom_entreprise")
      .in("partner_id", partnerIds)
      .order("nom_entreprise");

    if (businessesResult.error) throw businessesResult.error;
    businesses.push(...((businessesResult.data ?? []) as Json[]));
  }

  return {
    partners,
    partnerIds,
    businesses,
    businessIds: businesses
      .map((item) => cleanText(item["id"], 80))
      .filter(Boolean),
  };
}

function partnerPhotos(value: unknown, fallback?: unknown) {
  const urls: string[] = [];
  const push = (raw: unknown) => {
    const url = cleanText(raw, 2000);
    if (url && !urls.includes(url)) urls.push(url);
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        push(item);
      } else {
        const map = asMap(item);
        push(map["url"] ?? map["signed_url"] ?? map["photo_url"] ?? map["image_url"]);
      }
      if (urls.length >= 3) break;
    }
  } else {
    push(value);
  }

  if (urls.length === 0) push(fallback);
  return urls.slice(0, 3);
}

function firstPartnerPhoto(value: unknown, fallback?: unknown) {
  return partnerPhotos(value, fallback)[0] ?? "";
}

async function myPartnerProducts(
  service: ReturnType<typeof createClient>,
  userId: string,
) {
  const context = await ownedPartnerContext(service, userId);
  if (context.partnerIds.length === 0) return [] as Json[];

  const products = new Map<string, Json>();
  const businessNames = new Map<string, string>();

  for (const business of context.businesses) {
    businessNames.set(
      cleanText(business["id"], 80),
      cleanText(business["nom_entreprise"], 240),
    );
  }

  // Source principale et contractuelle : partner_id.
  const byPartner = await service
    .from("waouh_partner_products")
    .select("*")
    .in("partner_id", context.partnerIds)
    .order("nom");

  if (byPartner.error) throw byPartner.error;

  for (const row of byPartner.data ?? []) {
    const item = row as Json;
    const id = cleanText(item["id"], 80);
    if (!id) continue;
    const photos = partnerPhotos(
      item["photos"],
      item["photo_url"] ?? item["image_url"],
    );
    products.set(id, {
      ...item,
      business_name: businessNames.get(cleanText(item["business_id"], 80)) || null,
      photos,
      photo_url: photos[0] || null,
      quantity: Number(item["stock_estime"] ?? item["quantity"] ?? item["quantite"] ?? 0),
    });
  }

  // Compatibilité défensive avec d'anciennes lignes ayant business_id mais un
  // partner_id incomplet.
  if (context.businessIds.length > 0) {
    const byBusiness = await service
      .from("waouh_partner_products")
      .select("*")
      .in("business_id", context.businessIds)
      .order("nom");

    if (byBusiness.error) throw byBusiness.error;

    for (const row of byBusiness.data ?? []) {
      const item = row as Json;
      const id = cleanText(item["id"], 80);
      if (!id) continue;
      const photos = partnerPhotos(
        item["photos"],
        item["photo_url"] ?? item["image_url"],
      );
      products.set(id, {
        ...item,
        business_name: businessNames.get(cleanText(item["business_id"], 80)) || null,
        photos,
        photo_url: photos[0] || null,
        quantity: Number(item["stock_estime"] ?? item["quantity"] ?? item["quantite"] ?? 0),
      });
    }
  }

  return [...products.values()];
}

async function ensurePartnerProductOwnership(
  service: ReturnType<typeof createClient>,
  userId: string,
  productIds: string[],
) {
  const allowed = await myPartnerProducts(
    service,
    userId,
  );

  const ownedIds = new Set(
    allowed.map(
      (item: Json) => String(item["id"] ?? ""),
    ),
  );

  const invalid = productIds.filter(
    (id) => !ownedIds.has(id),
  );

  if (invalid.length > 0) {
    throw Object.assign(
      new Error(
        "Un produit sélectionné ne vous appartient pas.",
      ),
      { code: "FORBIDDEN", status: 403 },
    );
  }
}

async function createBucket(
  service: ReturnType<typeof createClient>,
  bucket: string,
  isPublic: boolean,
  fileSizeLimit = 15 * 1024 * 1024,
) {
  const { data } = await service.storage.getBucket(
    bucket,
  );

  if (!data) {
    const { error } = await service.storage.createBucket(
      bucket,
      {
        public: isPublic,
        fileSizeLimit,
      },
    );

    if (
      error &&
      !String(error.message).toLowerCase().includes("exist")
    ) {
      throw error;
    }
  }
}

function catalogMedia(value: unknown): Json[] {
  return asArray(value)
    .map(asMap)
    .filter((item) => cleanText(item["storage_path"], 600));
}

async function signedCatalogMedia(
  service: ReturnType<typeof createClient>,
  value: unknown,
  expiresIn = 3600,
) {
  const output: Json[] = [];

  for (const item of catalogMedia(value).slice(0, 4)) {
    const storagePath = cleanText(item["storage_path"], 600);
    const signed = await service.storage
      .from("agent-catalog-media")
      .createSignedUrl(storagePath, expiresIn);

    output.push({
      ...item,
      url: signed.data?.signedUrl ?? null,
    });
  }

  return output;
}

async function removeCatalogMedia(
  service: ReturnType<typeof createClient>,
  value: unknown,
) {
  const paths = catalogMedia(value)
    .map((item) => cleanText(item["storage_path"], 600))
    .filter(Boolean);

  if (paths.length > 0) {
    const removed = await service.storage
      .from("agent-catalog-media")
      .remove(paths);
    if (removed.error) {
      console.warn("catalog media cleanup", removed.error);
    }
  }
}

async function removeAgentCatalogMedia(
  service: ReturnType<typeof createClient>,
  userId: string,
  agentId: string,
) {
  const prefix = `${userId}/${agentId}`;
  const listed = await service.storage
    .from("agent-catalog-media")
    .list(prefix, { limit: 1000 });

  if (listed.error) {
    const message = String(listed.error.message ?? "").toLowerCase();
    if (!message.includes("not found") && !message.includes("bucket")) {
      console.warn("agent catalog media list", listed.error);
    }
    return;
  }

  const paths = (listed.data ?? [])
    .filter((item) => item.name)
    .map((item) => `${prefix}/${item.name}`);

  if (paths.length > 0) {
    const removed = await service.storage
      .from("agent-catalog-media")
      .remove(paths);
    if (removed.error) {
      console.warn("agent catalog media remove", removed.error);
    }
  }
}

async function sessionOperation(
  action: string,
  sessionName: string,
  phoneNumber?: string,
): Promise<Json> {
  const encoded = encodeURIComponent(sessionName);

  if (action === "repair-session") {
    return await ensureSessionWebhook(sessionName);
  }

  if (action === "audit-session") {
    const current = await wahaRequest(
      "GET",
      [
        `/api/sessions/${encoded}`,
        `/api/v2/sessions/${encoded}`,
      ],
    );

    if (current["success"] === false) {
      return current;
    }

    return {
      success: true,
      status: wahaStatus(current),
      webhook_configured: hasStudioWebhook(current),
      session: current,
    };
  }

  if (action === "start-session") {
    const webhook = await ensureSessionWebhook(sessionName);

    if (webhook["success"] === false) {
      return {
        ...webhook,
        success: false,
        error:
          `Webhook WhatsApp non configuré: ${String(
            webhook["error"] ?? "opération impossible",
          )}`,
      };
    }

    const started = await wahaRequest(
      "POST",
      [
        `/api/sessions/${encoded}/start`,
        `/api/v2/sessions/${encoded}/start`,
      ],
      {},
    );

    if (started["success"] === false) {
      return started;
    }

    return {
      ...started,
      webhook_configured: true,
      status: wahaStatus(started),
    };
  }

  if (action === "qr-session") {
    const webhook = await ensureSessionWebhook(sessionName);

    if (webhook["success"] === false) {
      return webhook;
    }

    let qr = await wahaRequest(
      "POST",
      [
        `/api/${encoded}/auth/qr?format=base64`,
        `/api/${encoded}/auth/qr`,
        `/api/v2/${encoded}/auth/qr?format=base64`,
      ],
      {},
    );

    if (
      qr["success"] === false ||
      (
        !qr["qrCode"] &&
        !qr["qr_code"] &&
        !qr["qr"] &&
        !qr["data"]
      )
    ) {
      qr = await wahaRequest(
        "GET",
        [
          `/api/${encoded}/auth/qr?format=image`,
          `/api/${encoded}/auth/qr?format=base64`,
          `/api/sessions/${encoded}/auth/qr?format=image`,
        ],
      );
    }

    return qr;
  }

  if (action === "pair-code") {
    const digits = String(phoneNumber ?? "")
      .replace(/\D/g, "");

    if (!/^[1-9]\d{6,14}$/.test(digits)) {
      throw Object.assign(
        new Error("Le numéro WhatsApp est incorrect."),
        { code: "INVALID_PHONE", status: 422 },
      );
    }

    const webhook = await ensureSessionWebhook(sessionName);

    if (webhook["success"] === false) {
      return webhook;
    }

    const started = await wahaRequest(
      "POST",
      [
        `/api/sessions/${encoded}/start`,
        `/api/sessions/${encoded}/start/`,
      ],
      {},
    );

    if (
      started["success"] === false &&
      Number(started["_status"] ?? 0) !== 409
    ) {
      return started;
    }

    // Some WAHA engines need several seconds to enter an
    // authentication state after the session starts.
    let lastStatus = "starting";

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const current = await wahaRequest(
        "GET",
        [
          `/api/sessions/${encoded}`,
          `/api/sessions/${encoded}/`,
        ],
      );

      if (current["success"] === false) {
        return current;
      }

      lastStatus = wahaStatus(current);

      if (lastStatus === "connected") {
        return {
          success: false,
          _status: 409,
          http_status: 409,
          code: "SESSION_ALREADY_CONNECTED",
          error:
            "Cette session WhatsApp est déjà connectée.",
          backend_version: STUDIO_API_VERSION,
        };
      }

      if (
        [
          "connecting",
          "pairing",
          "scan_qr_code",
          "scan_qr",
          "pending",
        ].includes(lastStatus)
      ) {
        break;
      }

      if (
        [
          "failed",
          "disconnected",
        ].includes(lastStatus)
      ) {
        const restarted = await wahaRequest(
          "POST",
          [
            `/api/sessions/${encoded}/restart`,
            `/api/sessions/${encoded}/restart/`,
          ],
          {},
        );

        if (restarted["success"] === false) {
          return restarted;
        }
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 850)
      );
    }

    const officialPaths = [
      `/api/${encoded}/auth/request-code`,
      `/api/${encoded}/auth/request-code/`,
    ];

    const codeResult = await wahaRequest(
      "POST",
      officialPaths,
      {
        phoneNumber: digits,
      },
    );

    if (codeResult["success"] === false) {
      const technical = String(
        codeResult["technical_error"] ??
        codeResult["error"] ??
        "",
      ).toLowerCase();

      const missingOfficialRoute =
        technical.includes("cannot post") ||
        technical.includes("route not found") ||
        technical.includes("endpoint not found") ||
        Number(codeResult["_status"] ?? 0) === 405;

      if (missingOfficialRoute) {
        return {
          success: false,
          _status: 422,
          http_status: 422,
          code: "PAIR_CODE_UNSUPPORTED",
          qr_fallback: true,
          backend_version: STUDIO_API_VERSION,
          attempted_paths: officialPaths,
          legacy_path_used: false,
          session_status: lastStatus,
          error:
            "Le serveur WAHA ne propose pas l’endpoint officiel "
            + "de code numéro. Utilisez le QR Code ou mettez WAHA "
            + "à jour.",
          technical_error: String(
            codeResult["technical_error"] ??
            codeResult["error"] ??
            "",
          ),
        };
      }

      return {
        ...codeResult,
        backend_version: STUDIO_API_VERSION,
        attempted_paths: officialPaths,
        legacy_path_used: false,
        session_status: lastStatus,
      };
    }

    const nested = asMap(codeResult["data"]);
    const code = cleanText(
      codeResult["code"] ??
      codeResult["code_raw"] ??
      codeResult["pairingCode"] ??
      codeResult["pairCode"] ??
      nested["code"] ??
      nested["code_raw"] ??
      nested["pairingCode"] ??
      nested["pairCode"],
      40,
    );

    if (!code) {
      return {
        success: false,
        _status: 502,
        http_status: 502,
        code: "PAIR_CODE_EMPTY",
        qr_fallback: true,
        backend_version: STUDIO_API_VERSION,
        attempted_paths: officialPaths,
        legacy_path_used: false,
        session_status: lastStatus,
        error:
          "WAHA a répondu sans fournir de code. "
          + "Utilisez le QR Code puis réessayez après mise à jour "
          + "du serveur WAHA.",
      };
    }

    return {
      ...codeResult,
      success: true,
      code,
      backend_version: STUDIO_API_VERSION,
      pair_code_endpoint:
        PAIR_CODE_ENDPOINT_TEMPLATE,
      legacy_path_used: false,
      session_status: lastStatus,
    };
  }

  if (action === "session-status") {
    const current = await wahaRequest(
      "GET",
      [
        `/api/sessions/${encoded}`,
        `/api/v2/sessions/${encoded}`,
      ],
    );

    if (current["success"] === false) {
      return current;
    }

    return {
      ...current,
      status: wahaStatus(current),
      webhook_configured: hasStudioWebhook(current),
    };
  }

  if (action === "stop-session") {
    const stopped = await wahaRequest(
      "POST",
      [
        `/api/sessions/${encoded}/stop`,
        `/api/v2/sessions/${encoded}/stop`,
      ],
      {},
    );

    if (stopped["success"] === false) {
      return stopped;
    }

    return {
      ...stopped,
      status: "STOPPED",
    };
  }

  if (action === "disconnect-session") {
    const loggedOut = await wahaRequest(
      "POST",
      [
        `/api/sessions/${encoded}/logout`,
        `/api/v2/sessions/${encoded}/logout`,
      ],
      {},
    );

    if (loggedOut["success"] === false) {
      const error = String(
        loggedOut["error"] ?? "",
      ).toLowerCase();

      const alreadyDisconnected =
        error.includes("not authenticated") ||
        error.includes("not logged") ||
        error.includes("already logged out") ||
        error.includes("scan_qr") ||
        error.includes("stopped");

      if (!alreadyDisconnected) {
        return loggedOut;
      }
    }

    return {
      success: true,
      status: "disconnected",
      already_disconnected:
        loggedOut["success"] === false,
    };
  }

  if (action === "delete-session") {
    const isAbsent = (result: Json) => {
      const error = String(
        result["technical_error"] ??
        result["error"] ??
        result["message"] ??
        result["body_read_error"] ??
        "",
      ).toLowerCase();
      const status = Number(result["_status"] ?? 0);

      return status === 404 ||
        error.includes("404") ||
        error.includes("not found") ||
        error.includes("does not exist") ||
        error.includes("unknown session") ||
        error.includes("introuvable");
    };

    const deletePath = `/api/sessions/${encoded}`;
    const statusPath = `/api/sessions/${encoded}`;

    let deleted = await wahaRequest(
      "DELETE",
      [deletePath],
    );

    if (deleted["success"] === true || isAbsent(deleted)) {
      return {
        success: true,
        remote_deleted: deleted["success"] === true,
        already_deleted: isAbsent(deleted),
        status: "deleted",
      };
    }

    const uncertain = String(
      deleted["technical_error"] ??
      deleted["error"] ??
      deleted["body_read_error"] ??
      "",
    ).toLowerCase();

    if (
      uncertain.includes("body already consumed") ||
      uncertain.includes("body is unusable") ||
      uncertain.includes("response body")
    ) {
      const verification = await wahaRequest(
        "GET",
        [statusPath],
      );

      if (isAbsent(verification)) {
        return {
          success: true,
          remote_verified_absent: true,
          status: "deleted",
        };
      }
    }

    // One bounded recovery attempt: stop, logout, delete.
    const verification = await wahaRequest(
      "GET",
      [statusPath],
    );

    if (verification["success"] === true) {
      await wahaRequest(
        "POST",
        [`/api/sessions/${encoded}/stop`],
        {},
      );

      await wahaRequest(
        "POST",
        [`/api/sessions/${encoded}/logout`],
        {},
      );

      deleted = await wahaRequest(
        "DELETE",
        [deletePath],
      );

      if (deleted["success"] === true || isAbsent(deleted)) {
        return {
          success: true,
          retried: true,
          status: "deleted",
        };
      }

      const finalVerification = await wahaRequest(
        "GET",
        [statusPath],
      );

      if (isAbsent(finalVerification)) {
        return {
          success: true,
          retried: true,
          remote_verified_absent: true,
          status: "deleted",
        };
      }
    } else if (isAbsent(verification)) {
      return {
        success: true,
        remote_verified_absent: true,
        status: "deleted",
      };
    }

    return deleted;
  }

  return {
    success: false,
    error: "Action de session inconnue.",
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return response(
      {
        success: false,
        error: "Méthode non autorisée.",
      },
      405,
    );
  }

  try {
    const body = await readJson(request);
    const action = cleanText(body["action"], 80);

    if (action === "public-health") {
      return response({
        success: true,
        version: STUDIO_API_VERSION,
        pair_code_endpoint:
          PAIR_CODE_ENDPOINT_TEMPLATE,
        legacy_pair_code_endpoint_enabled: false,
      });
    }

    const {
      user,
      service,
      token,
    } = await authenticatedContext(request);

    if (action === "probe") {
      return response({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
        },
      });
    }

    if (action === "list-sessions") {
      const { data, error } = await service
        .from("whatsapp_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      const labels = await sessionLabels(
        service,
        user.id,
      );

      const sessions = (data ?? []).map((row: Json) => ({
        ...row,
        display_name:
          row["display_name"] ??
          row["session_label"] ??
          row["name"] ??
          labels[String(row["session_name"] ?? "")] ??
          null,
      }));

      return response({
        success: true,
        sessions,
      });
    }

    if (action === "create-session") {
      const label = cleanText(body["label"], 60);
      const phoneNumber = cleanText(
        body["phoneNumber"],
        30,
      );

      if (!label) {
        throw new Error("Nom de la ligne manquant.");
      }

      if (phoneNumber && !/^[1-9]\d{6,14}$/.test(
        phoneNumber.replace(/\D/g, ""),
      )) {
        throw Object.assign(
          new Error("Le numéro WhatsApp est incorrect."),
          { code: "INVALID_PHONE", status: 422 },
        );
      }

      const sessionName =
        `wa_${user.id.slice(0, 8)}_${slug(label)}`;
      const remoteTimeoutMs = 8_000;
      const verificationTimeoutMs = 4_500;

      const existing = await service
        .from("whatsapp_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_name", sessionName)
        .maybeSingle();

      if (existing.error) throw existing.error;

      if (existing.data) {
        const repaired = await ensureSessionWebhook(
          sessionName,
          remoteTimeoutMs,
        );

        if (repaired["success"] === false) {
          const status = Number(repaired["_status"] ?? 0);
          const error = String(
            repaired["technical_error"] ?? repaired["error"] ?? "",
          ).toLowerCase();
          const remoteMissing =
            status === 404 ||
            error.includes("404") ||
            error.includes("not found") ||
            error.includes("introuvable");

          if (!remoteMissing) {
            const isTimeout = status === 408 || error.includes("timeout");
            throw Object.assign(
              new Error(
                isTimeout
                  ? "Le serveur WhatsApp est joignable trop lentement. Réessayez après vérification du service WAHA."
                  : String(
                      repaired["error"] ??
                      "La session existe mais son webhook ne peut pas être synchronisé.",
                    ),
              ),
              {
                code: isTimeout ? "WAHA_TIMEOUT" : "WAHA_UNAVAILABLE",
                status: 503,
              },
            );
          }

          const restored = await wahaRequest(
            "POST",
            ["/api/sessions"],
            {
              name: sessionName,
              config: studioSessionConfig(
                {},
                {
                  userId: user.id,
                  label,
                },
              ),
            },
            { timeoutMs: remoteTimeoutMs },
          );

          if (restored["success"] === false) {
            throw Object.assign(
              new Error(
                String(
                  restored["error"] ??
                  "La session locale existe mais WAHA ne peut pas la recréer.",
                ),
              ),
              {
                code: String(restored["code"] ?? "WAHA_UNAVAILABLE"),
                status: Number(restored["http_status"] ?? 503),
              },
            );
          }
        }

        return response({
          success: true,
          session_name: sessionName,
          session: existing.data,
          already_exists: true,
          webhook_configured: true,
          connection_checked: true,
        });
      }

      let created = await wahaRequest(
        "POST",
        ["/api/sessions"],
        {
          name: sessionName,
          config: studioSessionConfig(
            {},
            {
              userId: user.id,
              label,
            },
          ),
        },
        { timeoutMs: remoteTimeoutMs },
      );

      if (created["success"] === false) {
        const status = Number(created["_status"] ?? 0);
        const technicalError = String(
          created["technical_error"] ?? created["error"] ?? "",
        ).toLowerCase();
        const timedOut = status === 408 || technicalError.includes("timeout");

        if (timedOut) {
          // Le POST peut avoir atteint WAHA juste avant l'abandon du client.
          // Une lecture courte évite de créer un doublon et confirme l'état réel.
          const verification = await wahaRequest(
            "GET",
            [`/api/sessions/${encodeURIComponent(sessionName)}`],
            undefined,
            { timeoutMs: verificationTimeoutMs },
          );
          if (verification["success"] === true) {
            created = verification;
          }
        }
      }

      if (created["success"] === false) {
        const status = Number(created["_status"] ?? 0);
        const error = String(
          created["technical_error"] ?? created["error"] ?? "",
        ).toLowerCase();
        const alreadyExists =
          status === 409 ||
          error.includes("already exists") ||
          error.includes("duplicate") ||
          error.includes("existe déjà");

        if (alreadyExists) {
          const repaired = await ensureSessionWebhook(
            sessionName,
            remoteTimeoutMs,
          );
          if (repaired["success"] === false) {
            throw Object.assign(
              new Error(
                String(
                  repaired["error"] ??
                  "Session WAHA existante mais non synchronisée.",
                ),
              ),
              {
                code: String(repaired["code"] ?? "WAHA_UNAVAILABLE"),
                status: Number(repaired["http_status"] ?? 503),
              },
            );
          }
          created = repaired;
        } else {
          const timedOut = status === 408 || error.includes("timeout");
          throw Object.assign(
            new Error(
              timedOut
                ? "WAHA ne répond pas assez vite pour créer la session. Vérifiez le VPS WhatsApp puis réessayez."
                : String(created["error"] ?? "Création WAHA impossible."),
            ),
            {
              code: timedOut
                ? "WAHA_TIMEOUT"
                : String(created["code"] ?? "WAHA_UNAVAILABLE"),
              status: Number(created["http_status"] ?? 503),
            },
          );
        }
      }

      const row: Json = {
        user_id: user.id,
        session_name: sessionName,
        status: whatsappAccountStatus(
          created["status"] ?? created["session_status"] ?? "STOPPED",
        ),
        phone_number: phoneNumber || null,
        webhook_url: studioWebhookUrl(),
        last_activity: new Date().toISOString(),
      };

      let inserted = await service
        .from("whatsapp_accounts")
        .insert(row)
        .select("*")
        .single();

      if (inserted.error) {
        const fallback = await service
          .from("whatsapp_accounts")
          .select("*")
          .eq("user_id", user.id)
          .eq("session_name", sessionName)
          .maybeSingle();

        if (fallback.error || !fallback.data) {
          const minimal = await service
            .from("whatsapp_accounts")
            .insert({
              user_id: user.id,
              session_name: sessionName,
              status: "STOPPED",
              phone_number: phoneNumber || null,
            })
            .select("*")
            .single();

          if (minimal.error || !minimal.data) {
            throw inserted.error;
          }

          inserted = minimal as typeof inserted;
        } else {
          inserted = fallback as typeof inserted;
        }
      }

      return response({
        success: true,
        session_name: sessionName,
        session: inserted.data,
        webhook_configured: true,
        connection_checked: true,
        remote_status: wahaStatus(created),
      });
    }

    if (
      [
        "start-session",
        "qr-session",
        "pair-code",
        "session-status",
        "stop-session",
        "disconnect-session",
        "delete-session",
        "repair-session",
        "audit-session",
      ].includes(action)
    ) {
      const sessionName = cleanText(
        body["sessionName"],
        120,
      );

      if (!sessionName) {
        throw new Error("Session WhatsApp manquante.");
      }

      const account = await sessionRow(
        service,
        user.id,
        sessionName,
      );

      const result = await sessionOperation(
        action,
        sessionName,
        cleanText(body["phoneNumber"], 30),
      );

      if (result["success"] === false) {
        throwWahaResult(result);
      }

      if (
        action === "qr-session" &&
        !result["qrCode"] &&
        !result["qr_code"] &&
        !result["qr"]
      ) {
        const nested = asMap(result["data"]);
        result["qrCode"] =
          nested["qrCode"] ??
          nested["qr_code"] ??
          nested["qr"] ??
          nested["base64"] ??
          result["data"] ??
          result["value"];
      }

      if (
        action === "pair-code" &&
        !result["code"] &&
        !result["code_raw"]
      ) {
        const nested = asMap(result["data"]);
        result["code"] =
          nested["code"] ??
          nested["code_raw"] ??
          nested["pairingCode"] ??
          nested["pairCode"] ??
          result["pairingCode"] ??
          result["pairCode"];
      }

      if (action === "pair-code") {
        const normalizedPhone = cleanText(
          body["phoneNumber"],
          30,
        ).replace(/\D/g, "");

        const paired = await service
          .from("whatsapp_accounts")
          .update({
            status: "connecting",
            phone_number: normalizedPhone || null,
            last_activity: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("session_name", sessionName);

        if (paired.error) {
          throw paired.error;
        }

        result["status"] = "pairing";
      } else if (action === "start-session") {
        await updateSessionStatus(
          service,
          user.id,
          sessionName,
          "starting",
        );
      } else if (action === "stop-session") {
        await updateSessionStatus(
          service,
          user.id,
          sessionName,
          "stopped",
        );
      } else if (action === "disconnect-session") {
        const disconnected = await service
          .from("whatsapp_accounts")
          .update({
            status: whatsappAccountStatus(
              "disconnected",
            ),
            phone_number: null,
            last_activity: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("session_name", sessionName);

        if (disconnected.error) {
          throw disconnected.error;
        }
      } else if (
        action === "session-status" ||
        action === "repair-session"
      ) {
        const status = cleanText(
          result["status"] ?? "pending",
          80,
        ).toLowerCase();

        await updateSessionStatus(
          service,
          user.id,
          sessionName,
          status,
        );

        result["status"] = status;
      } else if (action === "audit-session") {
        const { data: activeAgent, error: agentError } =
          await service
            .from("waouh_ai_agents")
            .select("id,name,status,user_id,waha_session_name")
            .eq("user_id", user.id)
            .eq("waha_session_name", sessionName)
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (agentError) throw agentError;

        const status = cleanText(
          result["status"] ?? "pending",
          80,
        ).toLowerCase();
        const webhookConfigured =
          result["webhook_configured"] === true;
        const connected = [
          "connected",
          "working",
          "ready",
        ].includes(status);

        await updateSessionStatus(
          service,
          user.id,
          sessionName,
          status,
        );

        return response({
          success: true,
          audit: {
            session_name: sessionName,
            remote_status: status,
            connected,
            webhook_configured: webhookConfigured,
            active_agent_id: activeAgent?.id ?? null,
            active_agent_name: activeAgent?.name ?? null,
            active_agent_configured: Boolean(activeAgent),
            transport_ready:
              connected &&
              webhookConfigured &&
              Boolean(activeAgent),
          },
        });
      } else if (action === "delete-session") {
        const accountId = cleanText(account["id"], 120);

        const cleanupTasks: Promise<unknown>[] = [
          service
            .from("waouh_ai_agents")
            .update({
              waha_session_name: null,
              status: "paused",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .eq("waha_session_name", sessionName),
        ];

        if (accountId) {
          cleanupTasks.push(
            service
              .from("whatsapp_messages")
              .delete()
              .eq("whatsapp_account_id", accountId),
            service
              .from("whatsapp_bot_links")
              .delete()
              .eq("whatsapp_account_id", accountId),
          );
        }

        const cleanupResults = await Promise.all(cleanupTasks);

        for (const rawCleanup of cleanupResults) {
          const cleanup = asMap(rawCleanup);
          const cleanupError = asMap(cleanup["error"]);

          if (
            Object.keys(cleanupError).length > 0 &&
            cleanupError["code"] !== "42P01"
          ) {
            throw cleanupError;
          }
        }

        const deletedLocal = await service
          .from("whatsapp_accounts")
          .delete()
          .eq("user_id", user.id)
          .eq("session_name", sessionName)
          .select("id");

        if (deletedLocal.error) {
          throw deletedLocal.error;
        }

        const localVerification = await service
          .from("whatsapp_accounts")
          .select("id")
          .eq("user_id", user.id)
          .eq("session_name", sessionName)
          .maybeSingle();

        if (localVerification.error) {
          throw localVerification.error;
        }

        if (localVerification.data) {
          throw Object.assign(
            new Error(
              "La ligne locale n’a pas pu être supprimée. Réessayez.",
            ),
            {
              code: "LOCAL_DELETE_FAILED",
              status: 409,
            },
          );
        }

        result["local_deleted"] = true;

        // The display label is auxiliary metadata. A metadata failure must
        // not turn an already-completed WAHA/local deletion into an error.
        try {
          const labels = await sessionLabels(
            service,
            user.id,
          );
          delete labels[sessionName];
          await saveSessionLabels(
            service,
            user.id,
            labels,
          );
        } catch (labelError) {
          console.error(
            "Session label cleanup failed",
            labelError,
          );
          result["label_cleanup_pending"] = true;
        }
      }

      return response({
        success: true,
        ...result,
      });
    }

    if (action === "rename-session") {
      const sessionName = cleanText(
        body["sessionName"],
        120,
      );
      const displayName = cleanText(
        body["displayName"],
        80,
      );

      const row = await sessionRow(
        service,
        user.id,
        sessionName,
      );

      if (!displayName) {
        throw new Error("Nouveau nom manquant.");
      }

      const labels = await sessionLabels(
        service,
        user.id,
      );
      labels[sessionName] = displayName;
      await saveSessionLabels(
        service,
        user.id,
        labels,
      );

      const columns = [
        "display_name",
        "session_label",
        "name",
      ];

      for (const column of columns) {
        if (!(column in row)) continue;

        const result = await service
          .from("whatsapp_accounts")
          .update({
            [column]: displayName,
          })
          .eq("user_id", user.id)
          .eq("session_name", sessionName);

        if (!result.error) break;
      }

      if ("metadata" in row) {
        const metadata = asMap(row["metadata"]);
        metadata["display_name"] = displayName;

        await service
          .from("whatsapp_accounts")
          .update({ metadata })
          .eq("user_id", user.id)
          .eq("session_name", sessionName);
      }

      return response({
        success: true,
        display_name: displayName,
      });
    }

    if (action === "transport-health") {
      const sessionName = cleanText(
        body["sessionName"],
        120,
      );

      const account = await sessionRow(
        service,
        user.id,
        sessionName,
      );

      const remote = await wahaRequest(
        "GET",
        [
          `/api/sessions/${encodeURIComponent(sessionName)}`,
        ],
      );

      const remoteStatus = remote["success"] === false
        ? "unreachable"
        : wahaStatus(remote);

      let webhookReady =
        remote["success"] !== false &&
        hasStudioWebhook(remote);
      let webhookRepaired = false;

      if (
        remote["success"] !== false &&
        !webhookReady
      ) {
        const repaired = await ensureSessionWebhook(
          sessionName,
        );

        webhookReady =
          repaired["success"] !== false &&
          repaired["webhook_configured"] === true;
        webhookRepaired = webhookReady;
      }

      const { data: agents, error: agentError } =
        await service
          .from("waouh_ai_agents")
          .select("id,name,status,updated_at")
          .eq("user_id", user.id)
          .eq("waha_session_name", sessionName)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(2);

      if (agentError) throw agentError;

      const mappedStatus =
        remoteStatus === "connected"
          ? "connected"
          : remoteStatus;

      await service
        .from("whatsapp_accounts")
        .update({
          status: whatsappAccountStatus(
            mappedStatus,
          ),
          last_activity: new Date().toISOString(),
        })
        .eq("id", account.id)
        .eq("user_id", user.id);

      return response({
        success: true,
        session_name: sessionName,
        remote_status: remoteStatus,
        webhook_ready: webhookReady,
        webhook_repaired: webhookRepaired,
        active_agent_count: agents?.length ?? 0,
        active_agent: agents?.[0] ?? null,
        transport_ready:
          remoteStatus === "connected" &&
          webhookReady &&
          (agents?.length ?? 0) === 1,
        waha_error:
          remote["success"] === false
            ? remote["technical_error"] ?? remote["error"]
            : null,
      });
    }

    if (action === "list-agents") {
      const { data, error } = await service
        .from("waouh_ai_agents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      return response({
        success: true,
        agents: data ?? [],
      });
    }

    if (action === "create-agent") {
      const input = asMap(body["agent"]);
      const initialSlug = await uniquePublicSlug(service);
      const initialNow = new Date().toISOString();
      const initialPublicUrl = `${publicAgentBaseUrl()}/${encodeURIComponent(initialSlug)}`;
      const initialShare: Json = {
        slug: initialSlug,
        enabled: true,
        public_url: initialPublicUrl,
        qr_url: publicAgentQrUrl(initialSlug),
        created_at: initialNow,
        updated_at: initialNow,
        version: STUDIO_API_VERSION,
      };
      const allowed: Json = {
        user_id: user.id,
        name: cleanText(input["name"], 120),
        sector: cleanText(input["sector"], 80) || "other",
        template_id:
          cleanText(input["template_id"], 80) || "other",
        agent_type:
          cleanText(input["agent_type"], 40) || "docs",
        website_url:
          cleanText(input["website_url"], 500) || null,
        persona: asMap(input["persona"]),
        capabilities: {
          ...asMap(input["capabilities"]),
          public_share: initialShare,
        },
        status: "testing",
      };

      if (!allowed["name"]) {
        throw new Error("Nom de l’agent manquant.");
      }

      const { data, error } = await service
        .from("waouh_ai_agents")
        .insert(allowed)
        .select("*")
        .single();

      if (error) throw error;

      await appendAgentHistory(
        service,
        user.id,
        String(data.id),
        "agent_created",
        "Agent IA créé avec Web Chat partageable.",
      );

      return response({
        success: true,
        agent: data,
        share: initialShare,
      });
    }

    if (action === "get-agent-share") {
      const agentId = cleanText(body["agentId"], 80);
      const agent = await agentRow(
        service,
        user.id,
        agentId,
      );

      const shared = await ensureAgentPublicShare(
        service,
        user.id,
        agent,
      );
      const stats = asMap(shared.agent?.stats);

      return response({
        success: true,
        share: {
          ...shared.share,
          views: Number(stats["web_views"] ?? 0),
          conversations: Number(stats["web_conversations"] ?? 0),
          messages: Number(stats["web_messages"] ?? 0),
        },
      });
    }

    if (action === "set-agent-share") {
      const agentId = cleanText(body["agentId"], 80);
      const enabled = body["enabled"] === true;
      const agent = await agentRow(
        service,
        user.id,
        agentId,
      );

      const shared = await ensureAgentPublicShare(
        service,
        user.id,
        agent,
        { enabled },
      );

      await appendAgentHistory(
        service,
        user.id,
        agentId,
        enabled ? "public_share_enabled" : "public_share_disabled",
        enabled
          ? "Web Chat public activé."
          : "Web Chat public désactivé.",
      );

      const stats = asMap(shared.agent?.stats);
      return response({
        success: true,
        share: {
          ...shared.share,
          views: Number(stats["web_views"] ?? 0),
          conversations: Number(stats["web_conversations"] ?? 0),
          messages: Number(stats["web_messages"] ?? 0),
        },
      });
    }

    if (action === "regenerate-agent-share") {
      const agentId = cleanText(body["agentId"], 80);
      const agent = await agentRow(
        service,
        user.id,
        agentId,
      );

      const current = agentPublicShare(agent);
      const shared = await ensureAgentPublicShare(
        service,
        user.id,
        agent,
        {
          enabled: current["enabled"] !== false,
          regenerate: true,
        },
      );

      await appendAgentHistory(
        service,
        user.id,
        agentId,
        "public_share_regenerated",
        "Lien du Web Chat renouvelé.",
      );

      const stats = asMap(shared.agent?.stats);
      return response({
        success: true,
        share: {
          ...shared.share,
          views: Number(stats["web_views"] ?? 0),
          conversations: Number(stats["web_conversations"] ?? 0),
          messages: Number(stats["web_messages"] ?? 0),
        },
      });
    }

    if (action === "update-agent") {
      const agentId = cleanText(body["agentId"], 80);
      const changes = asMap(body["changes"]);

      const existingAgent = await agentRow(
        service,
        user.id,
        agentId,
      );

      const allowedKeys = new Set([
        "name",
        "sector",
        "template_id",
        "agent_type",
        "website_url",
        "persona",
        "capabilities",
        "status",
        "waha_session_name",
      ]);

      const update: Json = {};

      for (const [key, value] of Object.entries(changes)) {
        if (!allowedKeys.has(key)) continue;
        if (key === "capabilities") {
          const currentCapabilities = asMap(existingAgent?.capabilities);
          const nextCapabilities = asMap(value);
          update[key] = {
            ...currentCapabilities,
            ...nextCapabilities,
            public_share:
              nextCapabilities["public_share"] ??
              currentCapabilities["public_share"],
          };
        } else {
          update[key] = value;
        }
      }

      update["updated_at"] = new Date().toISOString();

      const { error } = await service
        .from("waouh_ai_agents")
        .update(update)
        .eq("id", agentId)
        .eq("user_id", user.id);

      if (error) throw error;

      await appendAgentHistory(
        service,
        user.id,
        agentId,
        "agent_updated",
        "Agent IA mis à jour.",
      );

      return response({ success: true });
    }

    if (action === "toggle-agent") {
      const agentId = cleanText(body["agentId"], 80);
      const enabled = body["enabled"] === true;

      await agentRow(
        service,
        user.id,
        agentId,
      );

      const { error } = await service
        .from("waouh_ai_agents")
        .update({
          status: enabled ? "active" : "paused",
          updated_at: new Date().toISOString(),
        })
        .eq("id", agentId)
        .eq("user_id", user.id);

      if (error) throw error;

      await appendAgentHistory(
        service,
        user.id,
        agentId,
        enabled ? "agent_activated" : "agent_paused",
        enabled
          ? "Agent IA activé."
          : "Agent IA mis en pause.",
      );

      return response({ success: true });
    }

    if (action === "deploy-agent") {
      const agentId = cleanText(body["agentId"], 80);
      const sessionName = cleanText(
        body["sessionName"],
        120,
      );

      await agentRow(
        service,
        user.id,
        agentId,
      );

      await sessionRow(
        service,
        user.id,
        sessionName,
      );

      const audit = await sessionOperation(
        "audit-session",
        sessionName,
      );

      if (audit["success"] === false) {
        throw new Error(
          String(
            audit["error"] ??
            "La ligne WhatsApp ne peut pas être vérifiée.",
          ),
        );
      }

      const remoteStatus = cleanText(
        audit["status"] ?? "pending",
        80,
      ).toLowerCase();

      if (
        !["connected", "working", "ready"].includes(
          remoteStatus,
        )
      ) {
        throw new Error(
          "Connectez d’abord cette ligne WhatsApp.",
        );
      }

      if (audit["webhook_configured"] !== true) {
        const repaired = await sessionOperation(
          "repair-session",
          sessionName,
        );

        if (repaired["success"] === false) {
          throw new Error(
            String(
              repaired["error"] ??
              "Le transport des messages n’a pas pu être configuré.",
            ),
          );
        }
      }

      await updateSessionStatus(
        service,
        user.id,
        sessionName,
        "connected",
      );

      const paused = await service
        .from("waouh_ai_agents")
        .update({
          status: "paused",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("waha_session_name", sessionName)
        .neq("id", agentId);

      if (paused.error) throw paused.error;

      const { error } = await service
        .from("waouh_ai_agents")
        .update({
          waha_session_name: sessionName,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", agentId)
        .eq("user_id", user.id);

      if (error) throw error;

      await appendAgentHistory(
        service,
        user.id,
        agentId,
        "agent_deployed",
        `Agent connecté à ${sessionName}.`,
      );

      return response({
        success: true,
        transport_ready: true,
        session_status: "connected",
        webhook_configured: true,
      });
    }

    if (action === "delete-agent") {
      const agentId = cleanText(body["agentId"], 80);

      await agentRow(
        service,
        user.id,
        agentId,
      );

      await removeAgentCatalogMedia(
        service,
        user.id,
        agentId,
      );

      const relatedTables = [
        "waouh_ai_agent_partner_products",
        "waouh_ai_agent_products",
        "waouh_ai_agent_knowledge",
      ];

      const cleanupResults = await Promise.all(
        relatedTables.map(async (table) => {
          const removed = await service
            .from(table)
            .delete()
            .eq("agent_id", agentId);

          return {
            table,
            error: removed.error,
          };
        }),
      );

      for (const item of cleanupResults) {
        if (!item.error) continue;

        const detail = String(
          item.error.message ?? "",
        ).toLowerCase();

        const missingTable =
          detail.includes("does not exist") ||
          detail.includes("schema cache");

        if (!missingTable) {
          throw item.error;
        }
      }

      const deleted = await service
        .from("waouh_ai_agents")
        .delete()
        .eq("id", agentId)
        .eq("user_id", user.id)
        .select("id");

      if (deleted.error) throw deleted.error;

      const verification = await service
        .from("waouh_ai_agents")
        .select("id")
        .eq("id", agentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (verification.error) {
        throw verification.error;
      }

      if (verification.data) {
        throw Object.assign(
          new Error(
            "L’agent n’a pas pu être supprimé. Réessayez.",
          ),
          {
            code: "AGENT_DELETE_FAILED",
            status: 409,
          },
        );
      }

      return response({
        success: true,
        deleted: true,
      });
    }

    if (action === "list-partner-products") {
      const products = await myPartnerProducts(
        service,
        user.id,
      );

      const context = await ownedPartnerContext(service, user.id);
      return response({
        success: true,
        products,
        diagnostics: {
          partners: context.partnerIds.length,
          businesses: context.businessIds.length,
          products: products.length,
        },
      });
    }

    if (
      action === "link-partner-products" ||
      action === "sync-partner-products"
    ) {
      const agentId = cleanText(body["agentId"], 80);
      const productIds = [...new Set(
        asArray(body["productIds"])
          .map((item) => cleanText(item, 80))
          .filter(Boolean),
      )];
      const replace = action === "sync-partner-products" &&
        body["replace"] !== false;

      await agentRow(
        service,
        user.id,
        agentId,
      );

      await ensurePartnerProductOwnership(
        service,
        user.id,
        productIds,
      );

      if (replace) {
        const existingLinks = await service
          .from("waouh_ai_agent_partner_products")
          .select("product_id")
          .eq("user_id", user.id)
          .eq("agent_id", agentId);
        if (existingLinks.error) throw existingLinks.error;

        const selected = new Set(productIds);
        const toRemove = (existingLinks.data ?? [])
          .map((item) => String(item.product_id ?? ""))
          .filter((id) => id && !selected.has(id));

        if (toRemove.length > 0) {
          const removed = await service
            .from("waouh_ai_agent_partner_products")
            .delete()
            .eq("user_id", user.id)
            .eq("agent_id", agentId)
            .in("product_id", toRemove);
          if (removed.error) throw removed.error;
        }
      }

      for (const productId of productIds) {
        const existing = await service
          .from("waouh_ai_agent_partner_products")
          .select("agent_id,product_id")
          .eq("user_id", user.id)
          .eq("agent_id", agentId)
          .eq("product_id", productId)
          .maybeSingle();

        if (existing.error) throw existing.error;
        if (existing.data) continue;

        const inserted = await service
          .from("waouh_ai_agent_partner_products")
          .insert({
            user_id: user.id,
            agent_id: agentId,
            product_id: productId,
          });

        if (inserted.error) throw inserted.error;
      }

      const verificationLinks = await service
        .from("waouh_ai_agent_partner_products")
        .select("product_id")
        .eq("user_id", user.id)
        .eq("agent_id", agentId);
      if (verificationLinks.error) throw verificationLinks.error;

      const verifiedIds = new Set<string>(
        (verificationLinks.data ?? [])
          .map((item) => String(item.product_id ?? ""))
          .filter(Boolean),
      );
      const missing = productIds.filter((id) => !verifiedIds.has(id));
      const unexpected = replace
        ? [...verifiedIds].filter((id) => !productIds.includes(id))
        : [];
      if (missing.length > 0 || unexpected.length > 0) {
        throw Object.assign(
          new Error("La synchronisation Partenaire n’a pas été confirmée après écriture."),
          {
            code: "PARTNER_SYNC_VERIFICATION_FAILED",
            status: 409,
            missing,
            unexpected,
          },
        );
      }

      await appendAgentHistory(
        service,
        user.id,
        agentId,
        replace ? "catalog_synced" : "catalog_linked",
        `${productIds.length} produit(s) partenaire synchronisé(s).`,
      );

      const availableProducts = await myPartnerProducts(service, user.id);
      return response({
        success: true,
        synchronized: productIds.length,
        available: availableProducts.length,
        product_ids: productIds,
      });
    }

    if (action === "repair-catalog-integrity") {
      const agentId = cleanText(body["agentId"], 80);
      const agent = await agentRow(service, user.id, agentId);

      const manual = await service
        .from("waouh_ai_agent_products")
        .select("*")
        .eq("user_id", user.id)
        .eq("agent_id", agentId);
      if (manual.error) throw manual.error;

      const manualRows = (manual.data ?? []) as Json[];
      const manualById = new Map(
        manualRows.map((row) => [String(row["id"] ?? ""), row]),
      );
      const capabilities = asMap(agent["capabilities"]);
      const original = asArray(capabilities["studio_catalog"]).map(asMap);
      const cleaned: Json[] = [];
      const seen = new Set<string>();
      const mediaToRemove: Json[] = [];

      for (const item of original) {
        const id = String(item["id"] ?? "");
        if (!id || seen.has(id) || !manualById.has(id)) {
          for (const media of catalogMedia(item["media"])) {
            const path = cleanText(media["storage_path"], 600);
            if (path.startsWith(`${user.id}/${agentId}/`)) mediaToRemove.push(media);
          }
          continue;
        }
        seen.add(id);
        const kindRaw = cleanText(item["kind"], 30);
        const kind = ["product", "training", "presentation"].includes(kindRaw)
          ? kindRaw
          : "product";
        const acceptedMedia: Json[] = [];
        let images = 0;
        let videos = 0;
        for (const media of asArray(item["media"]).map(asMap)) {
          const path = cleanText(media["storage_path"], 600);
          const mime = cleanText(media["mime_type"], 120);
          const type = cleanText(media["type"], 20);
          const isVideo = type === "video" || mime.startsWith("video/");
          const isImage = type === "image" || mime.startsWith("image/");
          let stored = false;
          if (path.startsWith(`${user.id}/${agentId}/`)) {
            const signed = await service.storage
              .from("agent-catalog-media")
              .createSignedUrl(path, 60);
            stored = !signed.error && Boolean(signed.data?.signedUrl);
          }
          const allowed = stored &&
            ((isImage && images < 3) || (isVideo && videos < 1 && kind !== "product"));
          if (allowed) {
            acceptedMedia.push({
              ...media,
              type: isVideo ? "video" : "image",
            });
            if (isVideo) videos += 1;
            if (isImage) images += 1;
          } else if (path.startsWith(`${user.id}/${agentId}/`)) {
            mediaToRemove.push(media);
          }
        }
        cleaned.push({
          ...item,
          id,
          agent_id: agentId,
          kind,
          source: ["manual", "smart_import"].includes(cleanText(item["source"], 30))
            ? cleanText(item["source"], 30)
            : "manual",
          media: acceptedMedia,
          updated_at: new Date().toISOString(),
        });
      }

      for (const [id, row] of manualById) {
        if (!id || seen.has(id)) continue;
        cleaned.push({
          id,
          agent_id: agentId,
          quantity: 0,
          active: row["active"] !== false,
          kind: "product",
          source: "manual",
          media: [],
          updated_at: new Date().toISOString(),
        });
      }

      await updateAgentCapabilities(
        service,
        user.id,
        agentId,
        (current) => {
          current["studio_catalog"] = cleaned;
          return current;
        },
      );

      const links = await service
        .from("waouh_ai_agent_partner_products")
        .select("product_id")
        .eq("user_id", user.id)
        .eq("agent_id", agentId);
      if (links.error) throw links.error;
      const owned = new Set(
        (await myPartnerProducts(service, user.id))
          .map((item) => String(item["id"] ?? "")),
      );
      const invalidLinks = (links.data ?? [])
        .map((item) => String(item.product_id ?? ""))
        .filter((id) => id && !owned.has(id));
      if (invalidLinks.length > 0) {
        const removed = await service
          .from("waouh_ai_agent_partner_products")
          .delete()
          .eq("user_id", user.id)
          .eq("agent_id", agentId)
          .in("product_id", invalidLinks);
        if (removed.error) throw removed.error;
      }

      await removeCatalogMedia(service, mediaToRemove);
      await appendAgentHistory(
        service,
        user.id,
        agentId,
        "catalog_integrity_repaired",
        "Intégrité du catalogue vérifiée et réparée.",
      );

      return response({
        success: true,
        repaired: true,
        catalog_items: cleaned.length,
        removed_partner_links: invalidLinks.length,
        removed_media: mediaToRemove.length,
      });
    }

    if (action === "audit-catalog-integrity") {
      const agentId = cleanText(body["agentId"], 80);
      const agent = await agentRow(service, user.id, agentId);

      const manual = await service
        .from("waouh_ai_agent_products")
        .select("id,name,active")
        .eq("user_id", user.id)
        .eq("agent_id", agentId);
      if (manual.error) throw manual.error;

      const links = await service
        .from("waouh_ai_agent_partner_products")
        .select("product_id")
        .eq("user_id", user.id)
        .eq("agent_id", agentId);
      if (links.error) throw links.error;

      const ownedProducts = await myPartnerProducts(service, user.id);
      const ownedIds = new Set(ownedProducts.map((item) => String(item["id"] ?? "")));
      const linkedIds = (links.data ?? [])
        .map((item) => String(item.product_id ?? ""))
        .filter(Boolean);

      const capabilities = asMap(agent["capabilities"]);
      const metadata = asArray(capabilities["studio_catalog"]).map(asMap);
      const manualIds = new Set<string>((manual.data ?? []).map((item) => String(item.id ?? "")));
      const metadataIds = new Set<string>(metadata.map((item) => String(item["id"] ?? "")).filter(Boolean));

      const orphanMetadata = [...metadataIds].filter((id) => !manualIds.has(id));
      const missingMetadata = [...manualIds].filter((id) => !metadataIds.has(id));
      const invalidPartnerLinks = linkedIds.filter((id) => !ownedIds.has(id));
      const invalidMediaPaths: string[] = [];
      const mediaPathsToCheck = new Set<string>();
      const missingMediaFiles: string[] = [];
      const invalidMediaTypes: string[] = [];
      const invalidKinds: string[] = [];
      const duplicateIds: string[] = [];
      const seen = new Set<string>();

      for (const item of metadata) {
        const id = String(item["id"] ?? "");
        if (id && seen.has(id)) duplicateIds.push(id);
        if (id) seen.add(id);
        const kind = cleanText(item["kind"], 30);
        if (!["product", "training", "presentation"].includes(kind)) {
          invalidKinds.push(id || "sans-id");
        }
        const kindMedia = asArray(item["media"]).map(asMap);
        let imageCount = 0;
        let videoCount = 0;
        for (const media of kindMedia) {
          const path = cleanText(media["storage_path"], 600);
          const type = cleanText(media["type"], 20);
          const mime = cleanText(media["mime_type"], 120);
          const isVideo = type === "video" || mime.startsWith("video/");
          const isImage = type === "image" || mime.startsWith("image/");
          if (isImage) imageCount += 1;
          if (isVideo) videoCount += 1;
          if (!isImage && !isVideo) invalidMediaTypes.push(id || "sans-id");
          if (kind === "product" && isVideo) invalidMediaTypes.push(id || "sans-id");
          if (path && !path.startsWith(`${user.id}/${agentId}/`)) {
            invalidMediaPaths.push(path);
          } else if (path) {
            mediaPathsToCheck.add(path);
          }
        }
        if (imageCount > 3 || videoCount > 1) {
          invalidMediaTypes.push(id || "sans-id");
        }
      }

      const mediaChecks = await Promise.all(
        [...mediaPathsToCheck].map(async (path) => {
          const signed = await service.storage
            .from("agent-catalog-media")
            .createSignedUrl(path, 60);
          return {
            path,
            ok: !signed.error && Boolean(signed.data?.signedUrl),
          };
        }),
      );
      missingMediaFiles.push(
        ...mediaChecks.filter((item) => !item.ok).map((item) => item.path),
      );

      const ok = orphanMetadata.length === 0 &&
        missingMetadata.length === 0 &&
        invalidPartnerLinks.length === 0 &&
        invalidMediaPaths.length === 0 &&
        missingMediaFiles.length === 0 &&
        invalidMediaTypes.length === 0 &&
        invalidKinds.length === 0 &&
        duplicateIds.length === 0;

      return response({
        success: true,
        ok,
        diagnostics: {
          manual_items: manual.data?.length ?? 0,
          partner_items: linkedIds.length,
          metadata_items: metadata.length,
          products: metadata.filter((item) => cleanText(item["kind"], 30) === "product").length + linkedIds.length,
          trainings: metadata.filter((item) => cleanText(item["kind"], 30) === "training").length,
          presentations: metadata.filter((item) => cleanText(item["kind"], 30) === "presentation").length,
          orphan_metadata: orphanMetadata,
          missing_metadata: missingMetadata,
          invalid_partner_links: invalidPartnerLinks,
          invalid_media_paths: invalidMediaPaths,
          missing_media_files: missingMediaFiles,
          invalid_media_types: [...new Set(invalidMediaTypes)],
          invalid_kinds: invalidKinds,
          duplicate_ids: duplicateIds,
        },
      });
    }

    if (action === "list-catalog") {
      const agentId = cleanText(body["agentId"], 80);

      if (agentId) {
        await agentRow(
          service,
          user.id,
          agentId,
        );
      }

      let query = service
        .from("waouh_ai_agent_products")
        .select("*")
        .eq("user_id", user.id)
        .order("position");

      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let agentQuery = service
        .from("waouh_ai_agents")
        .select("id, capabilities")
        .eq("user_id", user.id);

      if (agentId) agentQuery = agentQuery.eq("id", agentId);
      const agents = await agentQuery;
      if (agents.error) throw agents.error;

      const metadata = new Map<string, Json>();
      for (const agent of agents.data ?? []) {
        const capabilities = asMap(agent.capabilities);
        for (const item of asArray(capabilities["studio_catalog"])) {
          const map = asMap(item);
          metadata.set(String(map["id"] ?? ""), map);
        }
      }

      const items: Json[] = [];
      for (const row of data ?? []) {
        const meta = metadata.get(String(row.id ?? "")) ?? {};
        items.push({
          ...(row as Json),
          ...meta,
          media: await signedCatalogMedia(
            service,
            meta["media"],
          ),
        });
      }

      let linksQuery = service
        .from("waouh_ai_agent_partner_products")
        .select("agent_id,product_id")
        .eq("user_id", user.id);
      if (agentId) linksQuery = linksQuery.eq("agent_id", agentId);
      const links = await linksQuery;
      if (links.error) throw links.error;

      const owned = await myPartnerProducts(service, user.id);
      const ownedById = new Map(
        owned.map((item) => [String(item["id"] ?? ""), item]),
      );

      for (const link of links.data ?? []) {
        const productId = String(link.product_id ?? "");
        const product = ownedById.get(productId);
        if (!product) continue;

        const photoUrls = partnerPhotos(
          product["photos"],
          product["photo_url"] ?? product["image_url"],
        );
        const photoUrl = photoUrls[0] ?? "";

        items.push({
          id: `partner:${productId}`,
          agent_id: String(link.agent_id ?? agentId ?? ""),
          user_id: user.id,
          name: product["nom"] ?? product["name"] ?? "Produit",
          description: product["description"] ?? null,
          price_fcfa: product["prix_min"] ?? null,
          price_max: product["prix_max"] ?? null,
          quantity: product["quantity"] ?? product["quantite"] ?? 0,
          active: product["disponible"] !== false,
          category: product["categorie"] ?? null,
          photo_url: photoUrl || null,
          kind: "product",
          source: "partner",
          partner_product_id: productId,
          media: photoUrls.map((url, index) => ({
            type: "image",
            filename: `photo-partenaire-${index + 1}.jpg`,
            mime_type: "image/jpeg",
            url,
            caption: cleanText(product["nom"] ?? product["name"], 200) || "Produit Partenaire",
          })),
          updated_at: new Date().toISOString(),
        });
      }

      return response({
        success: true,
        items,
      });
    }

    if (action === "upsert-catalog-item") {
      const agentId = cleanText(body["agentId"], 80);
      const id = cleanText(body["id"], 80);
      const name = cleanText(body["name"], 160);
      const ownedAgent = await agentRow(
        service,
        user.id,
        agentId,
      );

      if (!name) {
        throw new Error("Nom ou titre manquant.");
      }

      const kindRaw = cleanText(body["kind"], 30);
      const kind = ["product", "training", "presentation"].includes(kindRaw)
        ? kindRaw
        : "product";
      const sourceRaw = cleanText(body["source"], 30);
      const source = ["manual", "smart_import"].includes(sourceRaw)
        ? sourceRaw
        : "manual";

      const requestedMedia = asArray(body["media"])
        .map(asMap)
        .filter((item) => {
          const path = cleanText(item["storage_path"], 600);
          return path.startsWith(`${user.id}/${agentId}/`);
        })
        .slice(0, 4)
        .map((item) => ({
          type: cleanText(item["type"], 20) === "video" ? "video" : "image",
          filename: safeFilename(cleanText(item["filename"], 160)),
          mime_type: cleanText(item["mime_type"], 120) || "image/jpeg",
          storage_path: cleanText(item["storage_path"], 600),
          caption: cleanText(item["caption"], 300) || null,
        }));

      const imageCount = requestedMedia.filter((item) => item.type === "image").length;
      const videoCount = requestedMedia.filter((item) => item.type === "video").length;
      if (imageCount > 3 || videoCount > 1) {
        throw Object.assign(
          new Error("Trois photos et une vidéo maximum sont autorisées."),
          { code: "MEDIA_LIMIT", status: 422 },
        );
      }
      if (kind === "product" && videoCount > 0) {
        throw Object.assign(
          new Error("Un produit accepte uniquement une à trois photos."),
          { code: "PRODUCT_VIDEO_NOT_ALLOWED", status: 422 },
        );
      }

      const startDate = cleanText(body["startDate"], 40);
      const endDate = cleanText(body["endDate"], 40);
      if (startDate && endDate) {
        const start = Date.parse(startDate);
        const end = Date.parse(endDate);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
          throw Object.assign(
            new Error("La date de fin doit être postérieure ou égale à la date de début."),
            { code: "INVALID_DATE_RANGE", status: 422 },
          );
        }
      }

      const baseRow: Json = {
        agent_id: agentId,
        user_id: user.id,
        name,
        description: cleanText(body["description"], 4000) || null,
        price_fcfa:
          kind === "product" && Number.isFinite(Number(body["priceFcfa"]))
            ? Math.round(Number(body["priceFcfa"]))
            : null,
        active: body["active"] !== false,
      };

      let item: Json;

      if (id) {
        const result = await service
          .from("waouh_ai_agent_products")
          .update(baseRow)
          .eq("id", id)
          .eq("agent_id", agentId)
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (result.error) throw result.error;
        item = result.data as Json;
      } else {
        const count = await service
          .from("waouh_ai_agent_products")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("agent_id", agentId)
          .eq("user_id", user.id);

        const result = await service
          .from("waouh_ai_agent_products")
          .insert({
            ...baseRow,
            position: count.count ?? 0,
          })
          .select("*")
          .single();

        if (result.error) throw result.error;
        item = result.data as Json;
      }

      const itemId = String(item["id"] ?? "");
      const capabilitiesBefore = asMap(ownedAgent["capabilities"]);
      const previousMetadata = asArray(capabilitiesBefore["studio_catalog"])
        .map(asMap)
        .find((entry: Json) => String(entry["id"] ?? "") === itemId);

      const metadata: Json = {
        id: itemId,
        agent_id: agentId,
        quantity: Math.max(0, Math.round(Number(body["quantity"] ?? 0))),
        photo_url: cleanText(body["photoUrl"], 2000) || null,
        sku: cleanText(body["sku"], 120) || null,
        active: body["active"] !== false,
        kind,
        catalog_title: cleanText(body["catalogTitle"], 200) || null,
        category: cleanText(body["category"], 160) || null,
        duration: cleanText(body["duration"], 160) || null,
        audience: cleanText(body["audience"], 500) || null,
        start_date: startDate || null,
        end_date: endDate || null,
        format: cleanText(body["format"], 120) || null,
        level: cleanText(body["level"], 120) || null,
        unit: cleanText(body["unit"], 80) || null,
        source,
        partner_product_id: cleanText(body["partnerProductId"], 80) || null,
        media: requestedMedia,
        updated_at: new Date().toISOString(),
      };

      await updateAgentCapabilities(
        service,
        user.id,
        agentId,
        (capabilities) => {
          const catalog = asArray(capabilities["studio_catalog"])
            .map(asMap)
            .filter((entry) => String(entry["id"] ?? "") !== itemId);
          catalog.push(metadata);
          capabilities["studio_catalog"] = catalog;
          return capabilities;
        },
      );

      if (previousMetadata) {
        const retained = new Set(
          requestedMedia.map((entry) => String(entry.storage_path ?? "")),
        );
        const removed = catalogMedia(previousMetadata["media"])
          .filter((entry) => !retained.has(String(entry["storage_path"] ?? "")));
        await removeCatalogMedia(service, removed);
      }

      const verifiedRow = await service
        .from("waouh_ai_agent_products")
        .select("id,name,agent_id,user_id,active")
        .eq("id", itemId)
        .eq("agent_id", agentId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (verifiedRow.error) throw verifiedRow.error;

      const verifiedAgent = await agentRow(service, user.id, agentId);
      const verifiedMetadata = asArray(asMap(verifiedAgent["capabilities"])["studio_catalog"])
        .map(asMap)
        .find((entry) => String(entry["id"] ?? "") === itemId);

      if (!verifiedRow.data || !verifiedMetadata ||
          cleanText(verifiedRow.data.name, 160) !== name ||
          cleanText(verifiedMetadata["kind"], 30) !== kind ||
          asArray(verifiedMetadata["media"]).length !== requestedMedia.length) {
        throw Object.assign(
          new Error("L’enregistrement du catalogue n’a pas été confirmé après écriture."),
          { code: "CATALOG_WRITE_VERIFICATION_FAILED", status: 409 },
        );
      }

      await appendAgentHistory(
        service,
        user.id,
        agentId,
        id ? "catalog_item_updated" : "catalog_item_created",
        `${name} ${id ? "mis à jour" : "ajouté"}.`,
      );

      return response({
        success: true,
        item: {
          ...item,
          ...metadata,
          media: await signedCatalogMedia(service, requestedMedia),
        },
      });
    }

    if (action === "delete-catalog-item") {
      const agentId = cleanText(body["agentId"], 80);
      const id = cleanText(body["id"], 120);
      const agent = await agentRow(
        service,
        user.id,
        agentId,
      );

      if (id.startsWith("partner:")) {
        const productId = id.slice("partner:".length);
        const removed = await service
          .from("waouh_ai_agent_partner_products")
          .delete()
          .eq("user_id", user.id)
          .eq("agent_id", agentId)
          .eq("product_id", productId);
        if (removed.error) throw removed.error;

        await appendAgentHistory(
          service,
          user.id,
          agentId,
          "partner_product_unlinked",
          "Produit Partenaire retiré du catalogue de l’agent.",
        );
        return response({ success: true });
      }

      const capabilities = asMap(agent["capabilities"]);
      const catalog = asArray(capabilities["studio_catalog"])
        .map(asMap);
      const metadata = catalog.find(
        (entry) => String(entry["id"] ?? "") === id,
      );

      const { error } = await service
        .from("waouh_ai_agent_products")
        .delete()
        .eq("id", id)
        .eq("agent_id", agentId)
        .eq("user_id", user.id);

      if (error) throw error;

      await updateAgentCapabilities(
        service,
        user.id,
        agentId,
        (current) => {
          current["studio_catalog"] = asArray(current["studio_catalog"])
            .map(asMap)
            .filter((entry) => String(entry["id"] ?? "") !== id);
          return current;
        },
      );

      if (metadata) {
        await removeCatalogMedia(service, metadata["media"]);
      }

      const deletedRowCheck = await service
        .from("waouh_ai_agent_products")
        .select("id")
        .eq("id", id)
        .eq("agent_id", agentId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (deletedRowCheck.error) throw deletedRowCheck.error;

      const deletedAgentCheck = await agentRow(service, user.id, agentId);
      const deletedMetadataStillPresent = asArray(
        asMap(deletedAgentCheck["capabilities"])["studio_catalog"],
      ).map(asMap).some((entry) => String(entry["id"] ?? "") === id);

      if (deletedRowCheck.data || deletedMetadataStillPresent) {
        throw Object.assign(
          new Error("La suppression du catalogue n’a pas été confirmée."),
          { code: "CATALOG_DELETE_VERIFICATION_FAILED", status: 409 },
        );
      }

      await appendAgentHistory(
        service,
        user.id,
        agentId,
        "catalog_item_deleted",
        "Élément supprimé du catalogue.",
      );

      return response({ success: true });
    }

    if (
      action === "upload-product-image" ||
      action === "upload-catalog-media"
    ) {
      const agentId = cleanText(body["agentId"], 80);
      const filename = safeFilename(cleanText(body["filename"], 160));
      const contentType = cleanText(body["contentType"], 120) || "image/jpeg";
      const base64 = cleanText(body["base64"], 26_000_000);

      await agentRow(
        service,
        user.id,
        agentId,
      );

      if (!base64) {
        throw new Error("Média manquant.");
      }

      const isImage = contentType.startsWith("image/");
      const isVideo = contentType.startsWith("video/");
      if (!isImage && !isVideo) {
        throw Object.assign(
          new Error("Seules les photos et vidéos sont acceptées."),
          { code: "UNSUPPORTED_MEDIA", status: 422 },
        );
      }

      const bytes = decodeBase64(base64);
      const limit = isVideo ? 18 * 1024 * 1024 : 12 * 1024 * 1024;
      if (bytes.length > limit) {
        throw Object.assign(
          new Error(isVideo
            ? "La vidéo dépasse 18 Mo."
            : "La photo dépasse 12 Mo."),
          { code: "MEDIA_TOO_LARGE", status: 413 },
        );
      }

      await createBucket(
        service,
        "agent-catalog-media",
        false,
        20 * 1024 * 1024,
      );

      const extension = filename.includes(".")
        ? filename.split(".").pop()
        : isVideo ? "mp4" : "jpg";
      const path = `${user.id}/${agentId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const upload = await service.storage
        .from("agent-catalog-media")
        .upload(path, bytes, {
          contentType,
          upsert: false,
        });

      if (upload.error) throw upload.error;

      const signed = await service.storage
        .from("agent-catalog-media")
        .createSignedUrl(path, 3600);
      if (signed.error) throw signed.error;

      const media = {
        type: isVideo ? "video" : "image",
        filename,
        mime_type: contentType,
        storage_path: path,
        url: signed.data?.signedUrl ?? null,
      };

      return response({
        success: true,
        media,
        url: media.url,
        storage_path: path,
      });
    }

    if (action === "list-documents") {
      const agentId = cleanText(body["agentId"], 80);

      let query = service
        .from("waouh_ai_agents")
        .select("id, capabilities")
        .eq("user_id", user.id);

      if (agentId) {
        query = query.eq("id", agentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const documents: Json[] = [];

      for (const agent of data ?? []) {
        const capabilities = asMap(agent.capabilities);

        for (
          const item of asArray(
            capabilities["studio_documents"],
          )
        ) {
          documents.push({
            ...asMap(item),
            agent_id: agent.id,
          });
        }
      }

      documents.sort(
        (left, right) =>
          String(right["created_at"] ?? "").localeCompare(
            String(left["created_at"] ?? ""),
          ),
      );

      return response({
        success: true,
        documents,
      });
    }

    if (action === "upload-document") {
      const agentId = cleanText(body["agentId"], 80);
      const filename = safeFilename(
        cleanText(body["filename"], 160),
      );
      const contentType =
        cleanText(body["contentType"], 160) ||
        "application/octet-stream";
      const base64 = cleanText(
        body["base64"],
        25_000_000,
      );

      await agentRow(
        service,
        user.id,
        agentId,
      );

      if (!base64) {
        throw new Error("Document manquant.");
      }

      await createBucket(
        service,
        "agent-documents",
        false,
      );

      const bytes = decodeBase64(base64);
      const path =
        `${user.id}/${agentId}/${Date.now()}-${filename}`;

      const upload = await service.storage
        .from("agent-documents")
        .upload(
          path,
          bytes,
          {
            contentType,
            upsert: false,
          },
        );

      if (upload.error) throw upload.error;

      const ingest = await internalFunction(
        "waouh-agent-ingest",
        {
          agent_id: agentId,
          source_type: "doc",
          storage_path: path,
          filename,
        },
        token,
      );

      if (
        ingest["_ok"] !== true ||
        ingest["error"]
      ) {
        await service.storage
          .from("agent-documents")
          .remove([path]);

        throw new Error(
          String(
            ingest["error"] ??
            "Le document n’a pas pu être analysé.",
          ),
        );
      }

      const document: Json = {
        id: crypto.randomUUID(),
        agent_id: agentId,
        name: filename,
        filename,
        storage_path: path,
        size_bytes: bytes.length,
        mime_type: contentType,
        status: "ready",
        created_at: new Date().toISOString(),
      };

      await updateAgentCapabilities(
        service,
        user.id,
        agentId,
        (capabilities) => {
          const documents = asArray(
            capabilities["studio_documents"],
          )
            .map(asMap);

          documents.unshift(document);
          capabilities["studio_documents"] =
            documents.slice(0, 100);

          return capabilities;
        },
      );

      await appendAgentHistory(
        service,
        user.id,
        agentId,
        "document_added",
        `${filename} ajouté.`,
      );

      return response({
        success: true,
        document,
      });
    }

    if (action === "document-url") {
      const agentId = cleanText(body["agentId"], 80);
      const storagePath = cleanText(
        body["storagePath"],
        500,
      );

      await agentRow(
        service,
        user.id,
        agentId,
      );

      if (
        !storagePath.startsWith(
          `${user.id}/${agentId}/`,
        )
      ) {
        throw Object.assign(
          new Error(
            "Ce document ne vous appartient pas.",
          ),
          { code: "FORBIDDEN", status: 403 },
        );
      }

      const signed = await service.storage
        .from("agent-documents")
        .createSignedUrl(storagePath, 600);

      if (signed.error || !signed.data?.signedUrl) {
        throw signed.error ??
          new Error("Lien sécurisé indisponible.");
      }

      return response({
        success: true,
        url: signed.data.signedUrl,
        expires_in: 600,
      });
    }

    if (action === "rename-document") {
      const agentId = cleanText(body["agentId"], 80);
      const storagePath = cleanText(
        body["storagePath"],
        500,
      );
      const name = safeFilename(
        cleanText(body["name"], 160),
      );

      await agentRow(
        service,
        user.id,
        agentId,
      );

      if (
        !storagePath.startsWith(
          `${user.id}/${agentId}/`,
        )
      ) {
        throw Object.assign(
          new Error(
            "Ce document ne vous appartient pas.",
          ),
          { code: "FORBIDDEN", status: 403 },
        );
      }

      if (!name) {
        throw new Error("Nouveau nom manquant.");
      }

      await updateAgentCapabilities(
        service,
        user.id,
        agentId,
        (capabilities) => {
          capabilities["studio_documents"] = asArray(
            capabilities["studio_documents"],
          )
            .map(asMap)
            .map((entry) => {
              if (
                String(entry["storage_path"] ?? "") ===
                storagePath
              ) {
                return {
                  ...entry,
                  name,
                  filename: name,
                  updated_at: new Date().toISOString(),
                };
              }

              return entry;
            });

          return capabilities;
        },
      );

      await appendAgentHistory(
        service,
        user.id,
        agentId,
        "document_renamed",
        `Document renommé en ${name}.`,
      );

      return response({ success: true });
    }

    if (action === "delete-document") {
      const agentId = cleanText(body["agentId"], 80);
      const storagePath = cleanText(
        body["storagePath"],
        500,
      );

      await agentRow(
        service,
        user.id,
        agentId,
      );

      if (
        !storagePath.startsWith(
          `${user.id}/${agentId}/`,
        )
      ) {
        throw Object.assign(
          new Error(
            "Ce document ne vous appartient pas.",
          ),
          { code: "FORBIDDEN", status: 403 },
        );
      }

      const removed = await service.storage
        .from("agent-documents")
        .remove([storagePath]);

      if (removed.error) throw removed.error;

      await updateAgentCapabilities(
        service,
        user.id,
        agentId,
        (capabilities) => {
          capabilities["studio_documents"] = asArray(
            capabilities["studio_documents"],
          )
            .map(asMap)
            .filter(
              (entry) =>
                String(entry["storage_path"] ?? "") !==
                storagePath,
            );

          return capabilities;
        },
      );

      await appendAgentHistory(
        service,
        user.id,
        agentId,
        "document_deleted",
        "Document supprimé.",
      );

      return response({ success: true });
    }

    if (action === "list-history") {
      const agents = await service
        .from("waouh_ai_agents")
        .select("id, name, capabilities")
        .eq("user_id", user.id);

      if (agents.error) throw agents.error;

      const history: Json[] = [];

      for (const agent of agents.data ?? []) {
        const capabilities = asMap(agent.capabilities);

        for (
          const item of asArray(
            capabilities["studio_history"],
          )
        ) {
          history.push({
            ...asMap(item),
            agent_id:
              asMap(item)["agent_id"] ?? agent.id,
          });
        }
      }

      history.sort(
        (left, right) =>
          String(right["created_at"] ?? "").localeCompare(
            String(left["created_at"] ?? ""),
          ),
      );

      return response({
        success: true,
        history: history.slice(0, 200),
      });
    }

    if (action === "clear-history") {
      const agents = await service
        .from("waouh_ai_agents")
        .select("id, capabilities")
        .eq("user_id", user.id);

      if (agents.error) throw agents.error;

      for (const agent of agents.data ?? []) {
        const capabilities = asMap(agent.capabilities);
        capabilities["studio_history"] = [];

        const updated = await service
          .from("waouh_ai_agents")
          .update({
            capabilities,
            updated_at: new Date().toISOString(),
          })
          .eq("id", agent.id)
          .eq("user_id", user.id);

        if (updated.error) throw updated.error;
      }

      return response({ success: true });
    }

    return response(
      {
        success: false,
        error: "Action inconnue.",
      },
      400,
    );
  } catch (error) {
    const typed = error as {
      code?: string;
      status?: number;
      message?: string;
    };

    const status = typed.status ?? 400;
    const code = typed.code ?? "STUDIO_ERROR";

    return response(
      {
        success: false,
        code,
        error: normalizeError(error),
        message: normalizeError(error),
      },
      status,
    );
  }
});
