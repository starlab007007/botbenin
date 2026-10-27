import {moduleRequestGate} from '../_shared/waouh-module-request.ts';
import {
  clients,
  corsHeaders,
  errorInfo,
  extractToken,
  response,
} from "../_shared/presence.ts";

Deno.serve(async (request) => {
  const __moduleGate=await moduleRequestGate(request,['presence'],false);if(__moduleGate)return __moduleGate;

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return response(405, { error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const { userClient } = await clients(request);
    const body = await request.json().catch(() => ({}));
    const token = extractToken(body?.qr_payload ?? body?.token);
    if (!token) throw new Error("QR_INVALID");

    const { data, error } = await userClient.rpc(
      "waouh_presence_preview_qr_v5",
      { p_token: token },
    );
    if (error) throw error;
    return response(200, { ok: true, ...data });
  } catch (error) {
    const info = errorInfo(error);
    console.error("waouh-presence-qr-preview", info);
    return response(400, {
      error: "PRESENCE_QR_PREVIEW_FAILED",
      ...info,
    });
  }
});
