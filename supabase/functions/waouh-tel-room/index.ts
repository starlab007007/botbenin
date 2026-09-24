import {
  createTelAdminClient,
  getTelSettings,
  isInternalRequest,
} from "../_shared/waouh-tel/config.ts";
import {
  executeRoomCommand,
  parseRoomCommand,
} from "../_shared/waouh-tel/rooms.ts";
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
  if (!(await isInternalRequest(req))) {
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
        "invalid_room_request",
        "Utilisateur ou commande de groupe invalide.",
        undefined,
        req,
      );
    }
    const command = parseRoomCommand(body.command);
    if (!command) {
      return telError(
        400,
        "unknown_room_command",
        "Commande de groupe inconnue.",
        undefined,
        req,
      );
    }
    const admin = createTelAdminClient();
    const settings = await getTelSettings(admin);
    const [{ data: telUser }, { data: thread }] = await Promise.all([
      admin.from("waouh_tel_users").select("*").eq("id", body.tel_user_id)
        .single(),
      admin.from("waouh_tel_threads").select("*").eq(
        "tel_user_id",
        body.tel_user_id,
      ).eq("thread_kind", "direct").eq("status", "open").order("updated_at", {
        ascending: false,
      }).limit(1).single(),
    ]);
    if (!telUser || !thread) {
      return telError(
        404,
        "tel_identity_not_found",
        "Identité ou conversation introuvable.",
        undefined,
        req,
      );
    }
    const result = await executeRoomCommand({
      admin,
      command,
      settings,
      telUser,
      thread,
      sourceMessageId: isUuid(body.source_message_id)
        ? body.source_message_id
        : null,
    });
    return telOk({ room_command: command.type, result }, 200, req);
  } catch (error) {
    return telError(
      500,
      "room_internal_error",
      "Impossible d'exécuter la commande de groupe.",
      error instanceof Error ? error.message : String(error),
      req,
    );
  }
});