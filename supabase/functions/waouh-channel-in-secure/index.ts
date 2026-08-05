import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  jsonError,
  jsonResponse,
  requireAuthOrGuestSession,
  waouhCorsHeaders,
} from "../_shared/waouh-auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: waouhCorsHeaders });
  if (req.method !== "POST") return jsonError(405, "method_not_allowed");

  try {
    const raw = await req.json().catch(() => ({}));
    const channel = raw?.channel || "web";

    // Cette fonction est l'entrée durcie pour le Web/App.
    // Les webhooks WAHA doivent continuer à utiliser waouh-channel-in directement.
    if (channel !== "web") return jsonError(400, "secure_entry_web_only");

    const auth = await requireAuthOrGuestSession(req, raw?.sessionId || null);
    if (!auth.ok) return auth.response;

    const cleanBody = {
      ...raw,
      channel: "web",
      // Ne jamais faire confiance à authUserId envoyé par le client :
      // il est dérivé du JWT Supabase quand il existe.
      authUserId: auth.authUser?.id ?? null,
      meta: {
        ...(raw?.meta && typeof raw.meta === "object" ? raw.meta : {}),
        validated_by: "waouh-channel-in-secure",
        session_validated: auth.sessionValid,
      },
    };

    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/waouh-channel-in`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE}`,
        "Content-Type": "application/json",
        "x-waouh-session": auth.bodySessionId ?? "",
      },
      body: JSON.stringify(cleanBody),
    });

    const rawText = await upstream.text();
    let payload: unknown = null;
    try { payload = JSON.parse(rawText); } catch { payload = rawText; }

    if (!upstream.ok) {
      console.error("[waouh-channel-in-secure] upstream failed", upstream.status, rawText.slice(0, 500));
      return jsonResponse({
        ok: false,
        code: "waouh_channel_upstream_failed",
        upstream_status: upstream.status,
        upstream: payload,
      }, upstream.status);
    }

    return jsonResponse(payload, upstream.status);
  } catch (e: any) {
    console.error("[waouh-channel-in-secure] error", e);
    return jsonError(500, "secure_channel_internal_error", e?.message ?? String(e));
  }
});
