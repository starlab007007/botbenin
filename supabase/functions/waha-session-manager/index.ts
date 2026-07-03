import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const actions = new Set([
  "create",
  "start",
  "stop",
  "status",
  "delete",
  "qr",
  "pair-code",
]);

type Action = "create" | "start" | "stop" | "status" | "delete" | "qr" | "pair-code";

type RequestBody = {
  action?: Action;
  sessionName?: string;
  phoneNumber?: string;
};

type WahaCredentials = {
  baseUrl: string;
  apiKey?: string;
  dashboardUser?: string;
  dashboardPassword?: string;
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const mapOf = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const textOf = (value: unknown) =>
  typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();

const cleanSessionName = (value: unknown) =>
  textOf(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30);

const normalizePhone = (value: unknown) => textOf(value).replace(/\D/g, "");

const base64FromBytes = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

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
    const base64 = base64FromBytes(new Uint8Array(await response.arrayBuffer()));
    return { qr: `data:image/png;base64,${base64}` };
  }
  const text = await response.text();
  return { data: text };
}

async function errorOf(response: Response) {
  try {
    const payload = await payloadOf(response);
    return textOf(payload.message ?? payload.error ?? payload.data) || response.statusText;
  } catch {
    return response.statusText;
  }
}

function extractQr(payload: Record<string, unknown>): string | null {
  const nested = mapOf(payload.data);
  const candidate = payload.qr ?? payload.qrCode ?? payload.base64 ?? payload.image ??
    payload.qrcode ?? nested.qr ?? nested.qrCode ?? nested.base64 ?? nested.image ?? nested.data ??
    payload.data;
  const value = textOf(candidate);
  if (!value) return null;
  if (value.startsWith("data:image") || value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(value) && value.length > 80) {
    return `data:image/png;base64,${value.replace(/\s+/g, "")}`;
  }
  return null;
}

function extractPairCode(payload: Record<string, unknown>): string | null {
  const nested = mapOf(payload.data);
  const candidate = payload.code ?? payload.pairingCode ?? payload.pairCode ??
    nested.code ?? nested.pairingCode ?? nested.pairCode;
  const value = textOf(candidate).replace(/\s+/g, "");
  return value || null;
}

function statusOf(payload: Record<string, unknown>, fallback = "DISCONNECTED") {
  return textOf(payload.status ?? payload.state ?? mapOf(payload.data).status ?? mapOf(payload.data).state) || fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Méthode non autorisée." }, 405);

  try {
    const body = await req.json() as RequestBody;
    const action = body.action;
    const sessionName = cleanSessionName(body.sessionName);
    if (!action || !actions.has(action)) {
      return json({ success: false, error: "Action WAHA invalide." }, 400);
    }
    if (!sessionName) {
      return json({ success: false, error: "Nom de session invalide." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({
        success: false,
        error: "Configuration Supabase incomplète pour la gestion des sessions.",
      }, 500);
    }

    const authorization = req.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ success: false, error: "Non authentifié." }, 401);

    const requester = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await requester.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) return json({ success: false, error: "Token invalide." }, 401);

    const { data: allowed, error: permissionError } = await requester.rpc("user_has_permission", {
      user_uuid: user.id,
      permission_name: "whatsapp.manage",
    });
    if (permissionError || allowed !== true) {
      return json({
        success: false,
        error: "Permission whatsapp.manage requise pour gérer les sessions WhatsApp.",
      }, 403);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const credentials: WahaCredentials = {
      baseUrl: (Deno.env.get("WAHA_BASE_URL") || "https://waha.bot.bj")
        .replace(/\/$/, "")
        .replace(/\/dashboard$/, ""),
      apiKey: Deno.env.get("WAHA_API_KEY_PLAIN")?.trim() || Deno.env.get("WAHA_API_KEY")?.trim(),
      dashboardUser: Deno.env.get("WAHA_DASHBOARD_USERNAME")?.trim(),
      dashboardPassword: Deno.env.get("WAHA_DASHBOARD_PASSWORD")?.trim(),
    };
    if (!credentials.apiKey && !(credentials.dashboardUser && credentials.dashboardPassword)) {
      return json({
        success: false,
        error: "WAHA_API_KEY ou les identifiants du tableau de bord WAHA doivent être configurés dans Supabase Secrets.",
      }, 500);
    }

    let dashboardAuthorization: string | null | undefined;
    const dashboardAuth = async () => {
      if (dashboardAuthorization !== undefined) return dashboardAuthorization;
      if (!credentials.dashboardUser || !credentials.dashboardPassword) {
        dashboardAuthorization = null;
        return dashboardAuthorization;
      }
      const basic = `Basic ${btoa(`${credentials.dashboardUser}:${credentials.dashboardPassword}`)}`;
      try {
        const response = await fetch(`${credentials.baseUrl}/dashboard/`, {
          headers: { Authorization: basic, Accept: "text/html,*/*" },
          redirect: "manual",
        });
        const cookie = response.headers.get("set-cookie")?.split(";")[0];
        dashboardAuthorization = response.ok && cookie ? `Cookie ${cookie}` : basic;
      } catch {
        dashboardAuthorization = basic;
      }
      return dashboardAuthorization;
    };

    const wahaFetch = async (path: string, init: RequestInit = {}) => {
      const headers: Record<string, string> = {
        Accept: "application/json, image/*;q=0.9, */*;q=0.8",
        ...(init.headers as Record<string, string> || {}),
      };
      if (init.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
      if (credentials.apiKey) {
        headers["X-Api-Key"] = credentials.apiKey;
      } else {
        const auth = await dashboardAuth();
        if (auth?.startsWith("Cookie ")) headers.Cookie = auth.substring("Cookie ".length);
        else if (auth) headers.Authorization = auth;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      try {
        return await fetch(`${credentials.baseUrl}${path}`, {
          ...init,
          headers,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    const webhookUrl = `${supabaseUrl}/functions/v1/waha-webhook`;
    const upsertAccount = async (changes: Record<string, unknown>) => {
      const { error } = await admin.from("whatsapp_accounts").upsert({
        user_id: user.id,
        session_name: sessionName,
        webhook_url: webhookUrl,
        last_activity: new Date().toISOString(),
        ...changes,
      }, { onConflict: "user_id,session_name" });
      if (error) throw new Error(`Synchronisation Supabase impossible: ${error.message}`);
    };

    const encodedSession = encodeURIComponent(sessionName);

    if (action === "create") {
      const candidates = ["/api/sessions", "/api/v2/sessions"];
      let lastError = "";
      for (const path of candidates) {
        const response = await wahaFetch(path, {
          method: "POST",
          body: JSON.stringify({
            name: sessionName,
            config: {
              webhooks: [{
                url: webhookUrl,
                events: ["message", "message.any", "message.ack", "message.reaction", "session.status"],
              }],
            },
          }),
        });
        const payload = await payloadOf(response);
        if (response.ok || response.status === 409) {
          await upsertAccount({
            status: statusOf(payload),
            waha_session_data: payload,
          });
          return json({ success: true, data: payload, existing: response.status === 409 });
        }
        lastError = `${path}: ${response.status} ${textOf(payload.message ?? payload.error ?? payload.data)}`;
      }
      return json({ success: false, error: `Création WAHA impossible. ${lastError}` }, 502);
    }

    if (action === "start") {
      const candidates = [
        `/api/sessions/${encodedSession}/start`,
        `/api/v2/sessions/${encodedSession}/start`,
      ];
      let lastError = "";
      for (const path of candidates) {
        const response = await wahaFetch(path, { method: "POST", body: JSON.stringify({}) });
        const payload = await payloadOf(response);
        if (response.ok || response.status === 409) {
          await upsertAccount({ status: "connecting", waha_session_data: payload });
          return json({ success: true, data: payload });
        }
        lastError = `${path}: ${response.status} ${textOf(payload.message ?? payload.error ?? payload.data)}`;
      }
      return json({ success: false, error: `Démarrage WAHA impossible. ${lastError}` }, 502);
    }

    if (action === "status") {
      const candidates = [
        `/api/sessions/${encodedSession}`,
        `/api/v2/sessions/${encodedSession}`,
      ];
      let lastError = "";
      for (const path of candidates) {
        const response = await wahaFetch(path, { method: "GET" });
        const payload = await payloadOf(response);
        if (response.ok) {
          await upsertAccount({
            status: statusOf(payload),
            phone_number: textOf(mapOf(payload.config).metadata && mapOf(mapOf(payload.config).metadata).phone_number) || null,
            waha_session_data: payload,
          });
          return json({ success: true, data: payload });
        }
        lastError = `${path}: ${response.status} ${textOf(payload.message ?? payload.error ?? payload.data)}`;
      }
      return json({ success: false, error: `Lecture du statut WAHA impossible. ${lastError}` }, 502);
    }

    if (action === "qr") {
      const candidates: { path: string; method: "GET" | "POST" }[] = [
        { path: `/api/${encodedSession}/auth/qr`, method: "POST" },
        { path: `/api/${encodedSession}/auth/qr?format=base64`, method: "POST" },
        { path: `/api/v2/${encodedSession}/auth/qr`, method: "POST" },
        { path: `/api/v2/${encodedSession}/auth/qr?format=base64`, method: "POST" },
        { path: `/api/sessions/${encodedSession}/auth/qr?format=base64`, method: "GET" },
        { path: `/api/sessions/${encodedSession}/qr?format=base64`, method: "GET" },
      ];
      let lastError = "";
      for (const candidate of candidates) {
        const response = await wahaFetch(candidate.path, {
          method: candidate.method,
          ...(candidate.method === "POST" ? { body: JSON.stringify({}) } : {}),
        });
        const payload = await payloadOf(response);
        const qrCode = response.ok ? extractQr(payload) : null;
        if (qrCode) {
          await upsertAccount({ qr_code: qrCode, status: "connecting" });
          return json({ success: true, data: payload, qrCode });
        }
        lastError = `${candidate.path}: ${response.status} ${textOf(payload.message ?? payload.error ?? payload.data)}`;
      }
      return json({ success: false, error: `QR indisponible. ${lastError}` }, 502);
    }

    if (action === "pair-code") {
      const phoneNumber = normalizePhone(body.phoneNumber);
      if (phoneNumber.length < 8) {
        return json({ success: false, error: "Numéro international invalide." }, 400);
      }
      const candidates = [
        { path: `/api/${encodedSession}/auth/request-code`, body: { phoneNumber } },
        { path: `/api/${encodedSession}/auth/request-code`, body: { phone: phoneNumber } },
        { path: `/api/v2/${encodedSession}/auth/request-code`, body: { phoneNumber } },
        { path: `/api/sessions/${encodedSession}/auth/request-code`, body: { phoneNumber } },
      ];
      let lastError = "";
      for (const candidate of candidates) {
        const response = await wahaFetch(candidate.path, {
          method: "POST",
          body: JSON.stringify(candidate.body),
        });
        const payload = await payloadOf(response);
        const code = response.ok ? extractPairCode(payload) : null;
        if (code) {
          const rawExpiry = payload.expires_in ?? payload.expiresIn ?? mapOf(payload.data).expires_in ?? 300;
          const expiresIn = Number.isFinite(Number(rawExpiry)) ? Number(rawExpiry) : 300;
          await upsertAccount({ status: "connecting" });
          return json({ success: true, data: payload, code, expires_in: expiresIn });
        }
        lastError = `${candidate.path}: ${response.status} ${textOf(payload.message ?? payload.error ?? payload.data)}`;
      }
      return json({ success: false, error: `Code de liaison indisponible. ${lastError}` }, 502);
    }

    if (action === "stop") {
      const candidates = [
        `/api/sessions/${encodedSession}/stop`,
        `/api/v2/sessions/${encodedSession}/stop`,
      ];
      let lastError = "";
      for (const path of candidates) {
        const response = await wahaFetch(path, { method: "POST", body: JSON.stringify({}) });
        const payload = await payloadOf(response);
        if (response.ok) {
          await upsertAccount({ status: "disconnected", qr_code: null, waha_session_data: payload });
          return json({ success: true, data: payload });
        }
        lastError = `${path}: ${response.status} ${textOf(payload.message ?? payload.error ?? payload.data)}`;
      }
      return json({ success: false, error: `Arrêt WAHA impossible. ${lastError}` }, 502);
    }

    if (action === "delete") {
      const candidates = [
        `/api/sessions/${encodedSession}`,
        `/api/v2/sessions/${encodedSession}`,
      ];
      let lastError = "";
      for (const path of candidates) {
        const response = await wahaFetch(path, { method: "DELETE" });
        if (response.ok || response.status === 404) {
          const { error } = await admin.from("whatsapp_accounts")
            .delete()
            .eq("user_id", user.id)
            .eq("session_name", sessionName);
          if (error) throw new Error(`Suppression Supabase impossible: ${error.message}`);
          return json({ success: true });
        }
        lastError = `${path}: ${response.status} ${await errorOf(response)}`;
      }
      return json({ success: false, error: `Suppression WAHA impossible. ${lastError}` }, 502);
    }

    return json({ success: false, error: "Action WAHA non prise en charge." }, 400);
  } catch (error) {
    console.error("waha-session-manager error", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return json({ success: false, error: message }, 500);
  }
});
