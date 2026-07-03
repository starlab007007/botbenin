import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "create" | "start" | "status" | "qr" | "stop" | "delete" | "attach_ai";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function safeSessionName(value: unknown) {
  const name = String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30);
  if (!name) throw new Error("Nom de session invalide");
  return name;
}

function base64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let output = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    output += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(output);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "Méthode non autorisée" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ success: false, error: "Configuration Supabase incomplète" }, 503);
    }

    const authorization = req.headers.get("authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return json({ success: false, error: "Non authentifié" }, 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth.user) return json({ success: false, error: "Session invalide" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "") as Action;
    const sessionName = safeSessionName(body.sessionName);
    const allowed: Action[] = ["create", "start", "status", "qr", "stop", "delete", "attach_ai"];
    if (!allowed.includes(action)) return json({ success: false, error: "Action inconnue" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const accountRows = await admin
      .from("whatsapp_accounts")
      .select("id,user_id,session_name,phone_number,status")
      .eq("session_name", sessionName)
      .limit(1);
    const existing = (accountRows.data || [])[0] as Record<string, unknown> | undefined;

    // The previous function required the global whatsapp.manage permission.
    // This mobile endpoint instead authorizes the account owner only.
    if (action !== "create" && (!existing || existing.user_id !== auth.user.id)) {
      return json({
        success: false,
        error: "Cette ligne ne vous appartient pas ou n’existe plus.",
        code: "SESSION_NOT_OWNED",
      }, 403);
    }
    if (action === "create" && existing && existing.user_id !== auth.user.id) {
      return json({ success: false, error: "Ce nom de ligne est déjà utilisé.", code: "SESSION_NAME_TAKEN" }, 409);
    }

    let baseUrl = (Deno.env.get("WAHA_BASE_URL") || "https://waha.bot.bj")
      .replace(/\/$/, "")
      .replace(/\/dashboard$/, "");
    const dashboardUser = Deno.env.get("WAHA_DASHBOARD_USERNAME") || "";
    const dashboardPassword = Deno.env.get("WAHA_DASHBOARD_PASSWORD") || "";
    const configuredKey = Deno.env.get("WAHA_API_KEY_PLAIN") || Deno.env.get("WAHA_API_KEY") || "";
    const apiKey = configuredKey.startsWith("sha512:") ? "" : configuredKey;
    const basic = dashboardUser && dashboardPassword ? `Basic ${btoa(`${dashboardUser}:${dashboardPassword}`)}` : "";

    const wahaFetch = async (path: string, init: RequestInit = {}) => {
      const url = `${baseUrl}${path}`;
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers as Record<string, string> | undefined),
      };
      const attempts: Array<Record<string, string>> = [];
      if (basic && apiKey) attempts.push({ ...headers, Authorization: basic, "X-API-Key": apiKey });
      if (basic) attempts.push({ ...headers, Authorization: basic });
      if (apiKey) attempts.push({ ...headers, "X-API-Key": apiKey });
      attempts.push(headers);
      let last: Response | undefined;
      for (const attempt of attempts) {
        const response = await fetch(url, { ...init, headers: attempt });
        last = response;
        if (response.status !== 401) return response;
      }
      return last!;
    };

    const bridgeUrl = `${supabaseUrl}/functions/v1/waha-agent-bridge`;
    const legacyWebhook = `${supabaseUrl}/functions/v1/waha-webhook`;
    const ensureAgentBridge = async () => {
      const response = await wahaFetch(`/api/sessions/${sessionName}`, { method: "GET" });
      if (!response.ok) throw new Error(`Session WAHA introuvable (${response.status})`);
      const raw = await response.json().catch(() => ({}));
      const config = raw?.config && typeof raw.config === "object" ? raw.config : {};
      const hooks = Array.isArray(config.webhooks) ? config.webhooks : [];
      if (hooks.some((item: any) => String(item?.url || "") === bridgeUrl)) return raw;
      const nextHooks = [
        ...hooks,
        {
          url: bridgeUrl,
          events: ["message", "message.any", "session.status"],
          hmac: false,
          retries: 3,
        },
      ];
      const update = await wahaFetch(`/api/sessions/${sessionName}`, {
        method: "PUT",
        body: JSON.stringify({ name: sessionName, config: { ...config, webhooks: nextHooks } }),
      });
      if (!update.ok) throw new Error(`Impossible d’associer l’Agent IA (${update.status})`);
      return raw;
    };

    if (action === "attach_ai") {
      await ensureAgentBridge();
      return json({ success: true });
    }

    if (action === "create") {
      const response = await wahaFetch("/api/sessions/", {
        method: "POST",
        body: JSON.stringify({
          name: sessionName,
          config: {
            webhooks: [
              {
                url: legacyWebhook,
                events: ["message", "message.any", "message.ack", "message.reaction", "session.status"],
                hmac: false,
                retries: 3,
              },
              {
                url: bridgeUrl,
                events: ["message", "message.any", "session.status"],
                hmac: false,
                retries: 3,
              },
            ],
          },
        }),
      });
      if (!response.ok && response.status !== 409) {
        return json({ success: false, error: `Création WAHA impossible (${response.status})` }, 502);
      }
      const data = response.status === 409 ? { name: sessionName, status: "existing" } : await response.json().catch(() => ({}));
      await admin.from("whatsapp_accounts").upsert({
        user_id: auth.user.id,
        session_name: sessionName,
        status: "disconnected",
        webhook_url: legacyWebhook,
        waha_session_data: data,
        last_activity: new Date().toISOString(),
      }, { onConflict: "user_id,session_name" });
      return json({ success: true, data });
    }

    if (action === "start") {
      const response = await wahaFetch(`/api/sessions/${sessionName}/start`, { method: "POST" });
      if (!response.ok) return json({ success: false, error: `Démarrage WAHA impossible (${response.status})` }, 502);
      const data = await response.json().catch(() => ({}));
      await admin.from("whatsapp_accounts").update({ status: "connecting", last_activity: new Date().toISOString() }).eq("id", existing!.id);
      return json({ success: true, data });
    }

    if (action === "status") {
      const response = await wahaFetch(`/api/sessions/${sessionName}`, { method: "GET" });
      if (!response.ok) return json({ success: false, error: "Session WAHA introuvable" }, 404);
      const data = await response.json().catch(() => ({}));
      await admin.from("whatsapp_accounts").update({
        status: data?.status || existing!.status || "disconnected",
        phone_number: data?.me?.id || existing!.phone_number || null,
        waha_session_data: data,
        last_activity: new Date().toISOString(),
      }).eq("id", existing!.id);
      return json({ success: true, data });
    }

    if (action === "stop") {
      const response = await wahaFetch(`/api/sessions/${sessionName}/stop`, { method: "POST" });
      if (!response.ok) return json({ success: false, error: `Arrêt WAHA impossible (${response.status})` }, 502);
      await admin.from("whatsapp_accounts").update({ status: "disconnected", qr_code: null, last_activity: new Date().toISOString() }).eq("id", existing!.id);
      return json({ success: true });
    }

    if (action === "delete") {
      const response = await wahaFetch(`/api/sessions/${sessionName}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) return json({ success: false, error: `Suppression WAHA impossible (${response.status})` }, 502);
      await admin.from("whatsapp_accounts").delete().eq("id", existing!.id);
      return json({ success: true });
    }

    // QR: first make sure the Agent bridge is present, then try documented and legacy WAHA endpoints.
    await ensureAgentBridge().catch(() => null);
    const endpoints: Array<{ path: string; method: "GET" | "POST" }> = [
      { path: `/api/${sessionName}/auth/qr`, method: "POST" },
      { path: `/api/${sessionName}/auth/qr?format=base64`, method: "POST" },
      { path: `/api/sessions/${sessionName}/auth/qr?format=base64`, method: "GET" },
      { path: `/api/sessions/${sessionName}/auth/qr`, method: "GET" },
      { path: `/api/sessions/${sessionName}/qr?format=base64`, method: "GET" },
    ];
    let lastError = "";
    for (const endpoint of endpoints) {
      try {
        const response = await wahaFetch(endpoint.path, { method: endpoint.method });
        const type = response.headers.get("content-type") || "";
        if (!response.ok) {
          lastError = `${endpoint.path}: ${response.status}`;
          continue;
        }
        let qrCode = "";
        let data: any = {};
        if (type.includes("application/json")) {
          data = await response.json().catch(() => ({}));
          qrCode = String(data.qr || data.base64 || data.image || data.qrcode || "").trim();
        } else if (type.includes("image/")) {
          qrCode = `data:image/png;base64,${base64(await response.arrayBuffer())}`;
        } else {
          const raw = (await response.text()).trim();
          if (raw.startsWith("data:image")) qrCode = raw;
          if (!qrCode && /^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 100) qrCode = `data:image/png;base64,${raw.replace(/\s+/g, "")}`;
        }
        if (qrCode) {
          await admin.from("whatsapp_accounts").update({ qr_code: qrCode, status: "connecting", last_activity: new Date().toISOString() }).eq("id", existing!.id);
          return json({ success: true, qrCode, data });
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    return json({ success: false, error: `QR indisponible. ${lastError || "Réessayez après le démarrage de la ligne."}`, code: "QR_UNAVAILABLE" }, 502);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("waha-session-mobile", error);
    return json({ success: false, error: message }, 400);
  }
});
