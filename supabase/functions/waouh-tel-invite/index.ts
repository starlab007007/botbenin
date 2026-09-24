import {
  createTelAdminClient,
  isInternalRequest,
} from "../_shared/waouh-tel/config.ts";
import { createInvite } from "../_shared/waouh-tel/invites.ts";
import {
  clampInt,
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
    const action = String(body?.action || "create");
    const admin = createTelAdminClient();
    if (action === "create") {
      const created = await createInvite(admin, {
        campaign: typeof body.campaign === "string"
          ? body.campaign.slice(0, 120)
          : null,
        initialMessage: typeof body.initial_message === "string"
          ? body.initial_message
          : null,
        maxUses: clampInt(body.max_uses, 1, 1, 100_000),
        expiresAt: body.expires_at && !Number.isNaN(Date.parse(body.expires_at))
          ? new Date(body.expires_at).toISOString()
          : null,
        createdBy: isUuid(body.created_by) ? body.created_by : null,
      });
      return telOk(created, 201, req);
    }
    if (action === "list") {
      const { data, error } = await admin.from("waouh_tel_invites").select(
        "id,code_hint,campaign,initial_message,max_uses,use_count,status,expires_at,created_at,updated_at",
      ).order("created_at", { ascending: false }).limit(
        clampInt(body.limit, 50, 1, 200),
      );
      if (error) throw error;
      return telOk({ invites: data || [] }, 200, req);
    }
    if (action === "revoke" && isUuid(body.invite_id)) {
      const { data, error } = await admin.from("waouh_tel_invites").update({
        status: "revoked",
      }).eq("id", body.invite_id).select("id,status").single();
      if (error) throw error;
      return telOk({ invite: data }, 200, req);
    }
    return telError(
      400,
      "invalid_action",
      "Action d'invitation invalide.",
      undefined,
      req,
    );
  } catch (error) {
    return telError(
      500,
      "invite_internal_error",
      "Impossible de gérer l'invitation.",
      error instanceof Error ? error.message : String(error),
      req,
    );
  }
});