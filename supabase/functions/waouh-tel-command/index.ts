import {
  createTelAdminClient,
  getTelSettings,
  isInternalRequest,
} from "../_shared/waouh-tel/config.ts";
import {
  executeTelCommand,
  parseTelCommand,
} from "../_shared/waouh-tel/commands.ts";
import {
  isUuid,
  methodNotAllowed,
  telCorsHeaders,
  telError,
  telOk,
} from "../_shared/waouh-tel/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: telCorsHeaders(req) });
  }
  if (req.method !== "POST") return methodNotAllowed(req);
  if (!isInternalRequest(req)) {
    return telError(
      401,
      "internal_authorization_required",
      "Autorisation interne requise.",
      undefined,
      req,
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (!isUuid(body.tel_user_id) || typeof body.command !== "string") {
      return telError(
        400,
        "invalid_command_request",
        "Utilisateur ou commande invalide.",
        undefined,
        req,
      );
    }
    const command = parseTelCommand(body.command);
    if (!command) {
      return telError(
        400,
        "unknown_command",
        "Commande WAOUH inconnue.",
        undefined,
        req,
      );
    }
    const admin = createTelAdminClient();
    const settings = await getTelSettings(admin);
    const { data: telUser } = await admin.from("waouh_tel_users").select("*")
      .eq("id", body.tel_user_id).single();
    let query = admin.from("waouh_tel_threads").select("*").eq(
      "tel_user_id",
      body.tel_user_id,
    ).eq("thread_kind", "direct").eq("status", "open");
    if (isUuid(body.thread_id)) query = query.eq("id", body.thread_id);
    const { data: thread } = await query.order("updated_at", {
      ascending: false,
    }).limit(1).single();
    if (!telUser || !thread) {
      return telError(
        404,
        "tel_identity_not_found",
        "Identité ou conversation introuvable.",
        undefined,
        req,
      );
    }
    const result = await executeTelCommand({
      admin,
      command,
      settings,
      telUser,
      thread,
      channel: body.channel === "rcs" ? "rcs" : "sms",
    });
    return telOk({ command: command.type, result }, 200, req);
  } catch (error) {
    return telError(
      500,
      "command_internal_error",
      "Impossible d'exécuter la commande.",
      error instanceof Error ? error.message : String(error),
      req,
    );
  }
});
