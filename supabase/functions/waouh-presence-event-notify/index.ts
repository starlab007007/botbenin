import {
  clients,
  corsHeaders,
  errorInfo,
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
    const {
      url,
      serviceKey,
      user,
      admin,
    } = await clients(request);

    const body = await request.json().catch(() => ({}));
    const eventId = String(body?.event_id ?? "").trim();
    if (!eventId) throw new Error("EVENT_REQUIRED");

    const { data: event, error: eventError } = await admin
      .from("waouh_presence_events")
      .select(
        "id,actor_user_id,site_id,action,occurred_at,distance_meters," +
          "waouh_presence_sites(name,user_id,responsible_whatsapp)," +
          "waouh_presence_members(display_name,employee_code)",
      )
      .eq("id", eventId)
      .single();
    if (eventError) throw eventError;

    const site = event.waouh_presence_sites as Record<string, unknown>;
    const member = event.waouh_presence_members as Record<string, unknown>;
    const ownerId = String(site?.user_id ?? "");

    if (String(event.actor_user_id ?? "") !== user.id && ownerId !== user.id) {
      const { data: manager, error: managerError } = await admin
        .from("waouh_presence_members")
        .select("id")
        .eq("site_id", event.site_id)
        .eq("member_user_id", user.id)
        .eq("role", "manager")
        .eq("status", "active")
        .maybeSingle();
      if (managerError) throw managerError;
      if (!manager) throw new Error("FORBIDDEN");
    }

    const recipient = String(site?.responsible_whatsapp ?? "")
      .replace(/\D/g, "");
    if (!recipient) {
      return response(200, {
        ok: true,
        skipped: true,
        reason: "RESPONSIBLE_WHATSAPP_NOT_CONFIGURED",
      });
    }

    const actionLabels: Record<string, string> = {
      arrival: "Arrivée",
      break_start: "Début de pause",
      break_end: "Retour de pause",
      departure: "Départ",
    };
    const message =
      `Présence QR · ${site?.name ?? "Site"}\n` +
      `${member?.display_name ?? "Membre"} ` +
      `(${member?.employee_code ?? "sans matricule"})\n` +
      `${actionLabels[event.action] ?? event.action}\n` +
      `${new Date(event.occurred_at).toLocaleString("fr-FR")}` +
      (event.distance_meters == null
        ? ""
        : `\nDistance : ${Math.round(Number(event.distance_meters))} m`);

    const { data: accounts, error: accountError } = await admin
      .from("whatsapp_accounts")
      .select("*")
      .eq("user_id", ownerId)
      .in("status", ["connected", "working", "active"])
      .order("updated_at", { ascending: false })
      .limit(1);
    if (accountError) throw accountError;
    const account = accounts?.[0] as Record<string, unknown> | undefined;

    const { data: log, error: logError } = await admin
      .from("waouh_presence_notification_log")
      .insert({
        event_id: eventId,
        site_id: event.site_id,
        recipient,
        channel: "whatsapp",
        status: "pending",
      })
      .select("id")
      .single();
    if (logError) throw logError;

    if (!account) {
      await admin
        .from("waouh_presence_notification_log")
        .update({
          status: "skipped",
          error_message: "Aucune ligne WhatsApp connectée.",
        })
        .eq("id", log.id);
      return response(200, {
        ok: true,
        skipped: true,
        reason: "NO_CONNECTED_WHATSAPP",
      });
    }

    const session = String(
      account.session_name ??
        account.name ??
        account.session ??
        account.id ??
        "",
    );

    const sendResponse = await fetch(
      `${url}/functions/v1/waha-send-message`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: ownerId,
          whatsapp_account_id: account.id,
          session,
          session_name: session,
          sessionName: session,
          phone: recipient,
          to: recipient,
          chatId: `${recipient}@c.us`,
          message,
          text: message,
        }),
      },
    );
    const sendText = await sendResponse.text();

    if (!sendResponse.ok) {
      await admin
        .from("waouh_presence_notification_log")
        .update({
          status: "failed",
          error_message: sendText.slice(0, 1000),
        })
        .eq("id", log.id);

      return response(200, {
        ok: true,
        skipped: true,
        reason: "WHATSAPP_SEND_FAILED",
      });
    }

    await admin
      .from("waouh_presence_notification_log")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", log.id);

    return response(200, { ok: true, sent: true });
  } catch (error) {
    const info = errorInfo(error);
    console.error("waouh-presence-event-notify", info);
    return response(400, {
      error: "PRESENCE_NOTIFY_FAILED",
      ...info,
    });
  }
});
