import {
  clients,
  corsHeaders,
  errorInfo,
  extractToken,
  response,
} from "../_shared/presence.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return response(405, { error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const { url, authorization, userClient } = await clients(request);
    const body = await request.json().catch(() => ({}));
    const token = extractToken(body?.qr_payload ?? body?.token);
    if (!token) throw new Error("QR_INVALID");

    const requestId =
      String(body?.request_id ?? "").trim() || crypto.randomUUID();

    const { data, error } = await userClient.rpc(
      "waouh_presence_record_qr_action_v5",
      {
        p_token: token,
        p_action: String(body?.action ?? "arrival"),
        p_latitude:
          body?.latitude == null ? null : Number(body.latitude),
        p_longitude:
          body?.longitude == null ? null : Number(body.longitude),
        p_accuracy_meters:
          body?.accuracy_meters == null
            ? null
            : Number(body.accuracy_meters),
        p_employee_code:
          String(body?.employee_code ?? "").trim() || null,
        p_pin: String(body?.pin ?? "").trim() || null,
        p_request_id: requestId,
      },
    );
    if (error) throw error;

    const eventId = data?.event?.id;
    if (eventId && data?.already_recorded !== true) {
      fetch(`${url}/functions/v1/waouh-presence-event-notify`, {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event_id: eventId }),
      }).catch((notifyError) => {
        console.warn("Presence notification skipped", notifyError);
      });
    }

    return response(200, { ok: true, ...data });
  } catch (error) {
    const info = errorInfo(error);
    console.error("waouh-presence-checkin", info);
    return response(400, {
      error: "PRESENCE_CHECKIN_FAILED",
      ...info,
    });
  }
});
