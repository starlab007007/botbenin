import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const VERSION = "21.4.6.2";
const FUNCTION_NAME = "waouh-studio-pair-code-v21462";
const OFFICIAL_ENDPOINT = "/api/{session}/auth/request-code";

type Json = Record<string, unknown>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function reply(body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "X-Waouh-Pair-Code-Version": VERSION,
    },
  });
}

function asMap(value: unknown): Json {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Json;
  }
  return {};
}

function clean(value: unknown, max = 240): string {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error ?? "Opération impossible.");
}

function normalizedBaseUrl(): string {
  let value = (
    Deno.env.get("WAHA_API_URL") ??
    Deno.env.get("WAHA_BASE_URL") ??
    Deno.env.get("WAHA_URL") ??
    ""
  ).trim();

  value = value.replace(/\/+$/, "");
  value = value.replace(/\/(dashboard|swagger)$/i, "");
  value = value.replace(/\/api$/i, "");
  return value;
}

function apiKey(): string {
  return (
    Deno.env.get("WAHA_API_KEY_PLAIN") ??
    Deno.env.get("WAHA_API_KEY") ??
    ""
  ).trim();
}

function headerVariants(): Record<string, string>[] {
  const key = apiKey();

  if (!key) {
    return [
      {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    ];
  }

  return [
    {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Api-Key": key,
    },
  ];
}

function statusOf(value: unknown): string {
  const candidates: string[] = [];

  const visit = (current: unknown, depth = 0) => {
    if (depth > 4 || current == null) return;
    if (Array.isArray(current)) {
      for (const item of current.slice(0, 8)) visit(item, depth + 1);
      return;
    }
    if (typeof current !== "object") return;

    const data = current as Record<string, unknown>;
    for (const key of [
      "status", "state", "connectionStatus", "connection_state",
      "authStatus", "auth_state",
    ]) {
      const value = clean(data[key], 80).toUpperCase();
      if (value) candidates.push(value);
    }
    for (const key of ["data", "session", "engine", "auth", "connection"]) {
      visit(data[key], depth + 1);
    }
  };

  visit(value);

  for (const value of candidates) {
    if (["WORKING", "CONNECTED", "READY", "ONLINE", "AUTHENTICATED"].includes(value)) {
      return "connected";
    }
    if (["SCAN_QR_CODE", "SCAN_QR", "QRCODE"].includes(value)) {
      return "scan_qr_code";
    }
    if (["PASSKEY_REQUIRED", "PASSKEY_CONFIRMATION_REQUIRED", "PAIRING"].includes(value)) {
      return "pairing";
    }
    if (["STARTING", "INITIALIZING"].includes(value)) return "starting";
    if (value === "STOPPED") return "stopped";
    if (["FAILED", "ERROR"].includes(value)) return "failed";
    if (["LOGGED_OUT", "DISCONNECTED"].includes(value)) return "disconnected";
  }
  return (candidates[0] ?? "PENDING").toLowerCase();
}

async function callWaha(
  method: string,
  path: string,
  body?: Json,
  timeoutMs = 15_000,
): Promise<Json> {
  const base = normalizedBaseUrl();
  if (!base) {
    return {
      success: false,
      code: "WAHA_CONFIG_MISSING",
      http_status: 503,
      requested_path: path,
      error: "La configuration WAHA est absente du backend.",
    };
  }

  let lastStatus = 502;
  let lastMessage = "WAHA n’a pas répondu.";

  for (const headers of headerVariants()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${base}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const raw = await response.text().catch(() => "");
      let data: Json = {};
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          data = Array.isArray(parsed) ? { data: parsed } : asMap(parsed);
        } catch {
          data = { message: raw };
        }
      }

      if (response.ok) {
        return {
          success: true,
          _status: response.status,
          requested_path: path,
          ...data,
        };
      }

      lastStatus = response.status;
      lastMessage = clean(
        data["message"] ?? data["error"] ?? data["detail"] ?? raw,
        1000,
      ) || `WAHA HTTP ${response.status}`;

      if (response.status === 401 || response.status === 403) {
        continue;
      }

      return {
        success: false,
        _status: response.status,
        requested_path: path,
        technical_error: lastMessage,
        error: lastMessage,
      };
    } catch (error) {
      lastMessage = error instanceof Error && error.name === "AbortError"
        ? "WAHA timeout"
        : normalizeError(error);
      lastStatus = error instanceof Error && error.name === "AbortError" ? 408 : 502;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    success: false,
    _status: lastStatus,
    requested_path: path,
    technical_error: lastMessage,
    error: lastMessage,
  };
}

async function authenticatedUser(request: Request) {
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw Object.assign(new Error("Connectez-vous pour continuer."), {
      code: "AUTH_REQUIRED",
      status: 401,
    });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    throw Object.assign(new Error("Votre session a expiré. Reconnectez-vous."), {
      code: "INVALID_TOKEN",
      status: 401,
    });
  }
  return data.user;
}

async function assertOwnership(userId: string, sessionName: string) {
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await service
    .from("whatsapp_accounts")
    .select("id,user_id,session_name,status")
    .eq("user_id", userId)
    .eq("session_name", sessionName)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw Object.assign(
      new Error("Cette ligne ne vous appartient pas ou n’existe plus."),
      { code: "SESSION_NOT_FOUND", status: 404 },
    );
  }
  return data;
}

function pairingCode(data: Json): string {
  const nested = asMap(data["data"]);
  return clean(
    data["code"] ??
      data["code_raw"] ??
      data["pairingCode"] ??
      data["pairCode"] ??
      nested["code"] ??
      nested["code_raw"] ??
      nested["pairingCode"] ??
      nested["pairCode"],
    40,
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return reply({ success: false, error: "Méthode non autorisée." }, 405);
  }

  try {
    const body = asMap(await request.json().catch(() => ({})));
    const action = clean(body["action"], 80);

    if (action === "runtime-health") {
      return reply({
        success: true,
        runtime_reachable: true,
        version: VERSION,
        function_name: FUNCTION_NAME,
        pair_code_endpoint: OFFICIAL_ENDPOINT,
        legacy_pair_code_endpoint_enabled: false,
        waha_configured: Boolean(normalizedBaseUrl()),
        waha_api_key_configured: Boolean(apiKey()),
      });
    }

    if (action === "public-health") {
      // Use the documented sessions endpoint only. The upstream budget is
      // deliberately shorter than the caller timeout so this function always
      // returns a JSON diagnosis, including when the WAHA VPS is unavailable.
      const startedAt = Date.now();
      const server = await callWaha(
        "GET",
        "/api/sessions?all=true",
        undefined,
        7_000,
      );
      const reachable = server["success"] !== false;

      return reply({
        success: true,
        runtime_reachable: true,
        version: VERSION,
        function_name: FUNCTION_NAME,
        pair_code_endpoint: OFFICIAL_ENDPOINT,
        legacy_pair_code_endpoint_enabled: false,
        waha_configured: Boolean(normalizedBaseUrl()),
        waha_api_key_configured: Boolean(apiKey()),
        waha_reachable: reachable,
        waha_http_status: server["_status"] ?? null,
        waha_probe_path: "/api/sessions?all=true",
        elapsed_ms: Date.now() - startedAt,
        waha_error: reachable
          ? null
          : clean(
              server["technical_error"] ??
              server["error"],
              500,
            ),
      });
    }

    if (action !== "request-code") {
      return reply({ success: false, error: "Action inconnue." }, 400);
    }

    const user = await authenticatedUser(request);
    const sessionName = clean(body["sessionName"], 120);
    const digits = String(body["phoneNumber"] ?? "").replace(/\D/g, "");

    if (!sessionName) {
      throw Object.assign(new Error("Nom de session manquant."), {
        code: "SESSION_NOT_FOUND",
        status: 404,
      });
    }
    if (!/^[1-9]\d{6,14}$/.test(digits)) {
      throw Object.assign(new Error("Le numéro WhatsApp est incorrect."), {
        code: "INVALID_PHONE",
        status: 422,
      });
    }

    await assertOwnership(user.id, sessionName);
    const encoded = encodeURIComponent(sessionName);

    let current = await callWaha("GET", `/api/sessions/${encoded}`);
    if (current["success"] === false) {
      const status = Number(current["_status"] ?? 0);
      return reply({
        ...current,
        success: false,
        code: status === 404 ? "SESSION_NOT_FOUND" : "WAHA_UNREACHABLE",
        version: VERSION,
      }, status === 404 ? 404 : 502);
    }

    let state = statusOf(current);
    if (state === "connected") {
      return reply({
        success: false,
        code: "SESSION_ALREADY_CONNECTED",
        error: "Cette session WhatsApp est déjà connectée.",
        status: state,
        version: VERSION,
      }, 409);
    }

    let restarted = false;

    if (state === "stopped" || state === "disconnected") {
      const started = await callWaha(
        "POST",
        `/api/sessions/${encoded}/start`,
        {},
      );

      if (
        started["success"] === false &&
        Number(started["_status"] ?? 0) !== 409
      ) {
        return reply({
          ...started,
          version: VERSION,
        }, 502);
      }
    } else if (state === "failed") {
      const restartedResult = await callWaha(
        "POST",
        `/api/sessions/${encoded}/restart`,
        {},
      );

      if (restartedResult["success"] === false) {
        return reply({
          ...restartedResult,
          version: VERSION,
        }, 502);
      }

      restarted = true;
    }

    // WEBJS requestPairingCode() calls Puppeteer page.evaluate().
    // STARTING is too early: the page can still be null. WAHA exposes
    // SCAN_QR_CODE precisely when QR or phone-number authentication is
    // ready.
    let pairingReady = false;
    let qrPrimed = false;

    for (let attempt = 0; attempt < 120; attempt += 1) {
      current = await callWaha(
        "GET",
        `/api/sessions/${encoded}`,
      );

      if (current["success"] === false) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );
        continue;
      }

      state = statusOf(current);

      if (state === "connected") {
        return reply({
          success: false,
          code: "SESSION_ALREADY_CONNECTED",
          error: "Cette session WhatsApp est déjà connectée.",
          status: state,
          version: VERSION,
        }, 409);
      }

      if (state === "scan_qr_code") {
        // Fetching the raw QR confirms that Chromium and pupPage are
        // initialized before calling requestPairingCode().
        const qr = await callWaha(
          "GET",
          `/api/${encoded}/auth/qr?format=raw`,
        );

        if (qr["success"] !== false) {
          qrPrimed = true;
          pairingReady = true;
          break;
        }
      }

      if (
        ["failed", "stopped", "disconnected"].includes(state)
      ) {
        const recovery = await callWaha(
          "POST",
          state === "stopped" || state === "disconnected"
            ? `/api/sessions/${encoded}/start`
            : `/api/sessions/${encoded}/restart`,
          {},
        );

        if (recovery["success"] !== false) {
          restarted = true;
        }
      } else if (
        state === "starting" &&
        attempt === 45 &&
        !restarted
      ) {
        const recovery = await callWaha(
          "POST",
          `/api/sessions/${encoded}/restart`,
          {},
        );

        if (recovery["success"] !== false) {
          restarted = true;
        }
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );
    }

    if (!pairingReady) {
      return reply({
        success: false,
        code: "PAIR_CODE_ENGINE_NOT_READY",
        status: state,
        qr_primed: qrPrimed,
        version: VERSION,
        qr_fallback: true,
        error:
          "Le moteur WEBJS est resté en cours de démarrage. "
          + "Le code numéro ne peut être demandé qu’après le statut "
          + "SCAN_QR_CODE. Redémarrez la session ou mettez WAHA à jour.",
      }, 503);
    }

    const officialPath =
      `/api/${encoded}/auth/request-code`;

    let result: Json = {
      success: false,
      _status: 502,
      error: "Aucune réponse WAHA.",
    };

    let code = "";

    // A WEBJS browser can navigate once more immediately after the
    // first QR. Retry only the known transient Puppeteer initialization
    // failure, never a route or authentication error.
    for (let codeAttempt = 0; codeAttempt < 6; codeAttempt += 1) {
      result = await callWaha(
        "POST",
        officialPath,
        {
          phoneNumber: digits,
        },
      );

      code = result["success"] === false
        ? ""
        : pairingCode(result);

      if (code) break;

      const technical = clean(
        result["technical_error"] ??
        result["error"],
        2000,
      ).toLowerCase();

      const browserNotReady =
        Number(result["_status"] ?? 0) === 500 &&
        (
          technical.includes("reading 'evaluate'") ||
          technical.includes('reading "evaluate"') ||
          technical.includes("cannot read properties of null") ||
          technical.includes("puppage")
        );

      if (!browserNotReady) break;

      await new Promise((resolve) =>
        setTimeout(resolve, 3500)
      );

      current = await callWaha(
        "GET",
        `/api/sessions/${encoded}`,
      );

      if (current["success"] !== false) {
        state = statusOf(current);
      }

      if (state !== "scan_qr_code") {
        for (
          let readyAttempt = 0;
          readyAttempt < 30;
          readyAttempt += 1
        ) {
          current = await callWaha(
            "GET",
            `/api/sessions/${encoded}`,
          );

          if (current["success"] !== false) {
            state = statusOf(current);
          }

          if (state === "scan_qr_code") break;

          await new Promise((resolve) =>
            setTimeout(resolve, 1000)
          );
        }
      }

      await callWaha(
        "GET",
        `/api/${encoded}/auth/qr?format=raw`,
      );
    }

    if (code) {
      return reply({
        success: true,
        code,
        status: state,
        version: VERSION,
        function_name: FUNCTION_NAME,
        pair_code_endpoint: OFFICIAL_ENDPOINT,
        requested_path: officialPath,
        legacy_pair_code_endpoint_enabled: false,
        browser_ready: true,
      });
    }

    if (result["success"] === false) {
      const technical = clean(result["technical_error"] ?? result["error"], 1000);
      const lower = technical.toLowerCase();
      const proxyRewroteRoute = lower.includes("/api/sessions/") &&
        lower.includes("/auth/request-code");

      if (proxyRewroteRoute) {
        return reply({
          success: false,
          code: "PAIR_CODE_PROXY_REWRITE",
          error:
            "Le proxy WAHA réécrit l’endpoint officiel vers une ancienne route. " +
            "Mettez à jour la configuration du proxy ou l’image WAHA.",
          technical_error: technical,
          requested_path: officialPath,
          version: VERSION,
          qr_fallback: true,
        }, 502);
      }

      const engineNotReady =
        Number(result["_status"] ?? 0) === 500 &&
        (
          lower.includes("reading 'evaluate'") ||
          lower.includes('reading "evaluate"') ||
          lower.includes("cannot read properties of null") ||
          lower.includes("puppage")
        );

      if (engineNotReady) {
        return reply({
          success: false,
          code: "PAIR_CODE_ENGINE_NOT_READY",
          error:
            "Le navigateur WEBJS n’est pas initialisé pour le code "
            + "numéro. La session doit atteindre SCAN_QR_CODE. "
            + "Redémarrez-la ou mettez WAHA à jour.",
          technical_error: technical,
          requested_path: officialPath,
          status: state,
          version: VERSION,
          qr_fallback: true,
        }, 503);
      }

      const missing = Number(result["_status"] ?? 0) === 404 ||
        Number(result["_status"] ?? 0) === 405 ||
        lower.includes("cannot post") ||
        lower.includes("route not found") ||
        lower.includes("endpoint not found");

      if (missing) {
        return reply({
          success: false,
          code: "PAIR_CODE_UNSUPPORTED",
          error:
            "Le serveur WAHA appelé ne reconnaît pas l’endpoint officiel " +
            "/api/{session}/auth/request-code. Vérifiez que Supabase utilise " +
            "bien WAHA_BASE_URL=https://waha.bot.bj et la clé API en clair, " +
            "puis mettez WAHA à jour si nécessaire.",
          technical_error: technical,
          requested_path: officialPath,
          version: VERSION,
          qr_fallback: true,
        }, 422);
      }

      return reply({
        ...result,
        success: false,
        code: clean(result["code"], 80) || "PAIR_CODE_FAILED",
        requested_path: officialPath,
        version: VERSION,
      }, Number(result["_status"] ?? 502));
    }

    return reply({
      success: false,
      code: "PAIR_CODE_EMPTY",
      error: "WAHA a répondu sans fournir de code de liaison.",
      requested_path: officialPath,
      version: VERSION,
      raw_keys: Object.keys(result),
      qr_fallback: true,
    }, 502);
  } catch (error) {
    const status = Number((error as { status?: number })?.status ?? 500);
    const code = clean((error as { code?: string })?.code, 80) || "PAIR_CODE_ERROR";
    return reply({
      success: false,
      code,
      error: normalizeError(error),
      version: VERSION,
    }, status);
  }
});
