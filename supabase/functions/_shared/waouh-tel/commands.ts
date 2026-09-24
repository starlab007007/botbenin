import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
import { enqueueTelMessage } from "./db.ts";
import type { TelOutboundPayload, TelSettings } from "./types.ts";

export type TelCommand =
  | { type: "stop" }
  | { type: "resume" }
  | { type: "help" }
  | { type: "status" }
  | { type: "erase_request" }
  | { type: "erase_confirm" }
  | null;

function normalized(text: string) {
  return text.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/\s+/g, " ");
}

export function parseTelCommand(text: string): TelCommand {
  const value = normalized(text);
  if (/^(STOP|ARRET|DESINSCRIRE|DESABONNER)$/.test(value)) {
    return { type: "stop" };
  }
  if (/^(START|REPRENDRE|REACTIVER|BONJOUR(?: WAOUH)?)$/.test(value)) {
    return { type: "resume" };
  }
  if (/^(AIDE|HELP|COMMANDES)$/.test(value)) return { type: "help" };
  if (/^(STATUT|STATUS)$/.test(value)) return { type: "status" };
  if (/^EFFACER CONFIRMER$/.test(value)) return { type: "erase_confirm" };
  if (/^(EFFACER|SUPPRIMER MES DONNEES)$/.test(value)) {
    return { type: "erase_request" };
  }
  return null;
}

function payload(text: string): TelOutboundPayload {
  return { schema: "waouh.tel.outbound.v1", text };
}

export async function executeTelCommand(options: {
  admin: SupabaseClient;
  command: Exclude<TelCommand, null>;
  settings: TelSettings;
  telUser: any;
  thread: any;
  channel: "sms" | "rcs";
  dedupeKey?: string;
}) {
  const { admin, command, settings, telUser, thread, channel, dedupeKey } =
    options;
  if (command.type === "stop") {
    const { data, error } = await admin.rpc("waouh_tel_set_consent_state", {
      p_tel_user_id: telUser.id,
      p_action: "stop",
      p_channel: channel,
      p_terms_version: settings.terms_version,
    });
    if (error || data !== true) {
      throw new Error(`tel_stop_failed:${error?.message || "not_found"}`);
    }
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      channelPreference: channel,
      dedupeKey,
      payload: payload(
        "Vous ne recevrez plus de messages WAOUH. Envoyez REPRENDRE pour réactiver le service.",
      ),
    });
  }
  if (command.type === "resume") {
    const { data, error } = await admin.rpc("waouh_tel_set_consent_state", {
      p_tel_user_id: telUser.id,
      p_action: "resume",
      p_channel: channel,
      p_terms_version: settings.terms_version,
    });
    if (error || data !== true) {
      throw new Error(`tel_resume_failed:${error?.message || "not_found"}`);
    }
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      channelPreference: channel,
      dedupeKey,
      payload: payload(
        "WAOUH Messages est actif. Décrivez ce que vous cherchez ou envoyez AIDE.",
      ),
    });
  }
  if (command.type === "help") {
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      channelPreference: channel,
      dedupeKey,
      payload: payload(settings.help_text),
    });
  }
  if (command.type === "status") {
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      channelPreference: channel,
      dedupeKey,
      payload: payload(
        `WAOUH Messages : ${
          telUser.status === "active" ? "actif" : "arrêté"
        }. Canal actuel : ${channel.toUpperCase()}.`,
      ),
    });
  }
  if (command.type === "erase_request") {
    const { error } = await admin.from("waouh_tel_users").update({
      metadata: {
        ...(telUser.metadata || {}),
        deletion_requested_at: new Date().toISOString(),
      },
    }).eq("id", telUser.id);
    if (error) throw new Error(`erase_request_failed:${error.message}`);
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      channelPreference: channel,
      dedupeKey,
      payload: payload(
        "Pour effacer définitivement vos données WAOUH Messages, envoyez EFFACER CONFIRMER dans les 15 minutes.",
      ),
    });
  }

  const requestedAt = Date.parse(
    String(telUser.metadata?.deletion_requested_at || ""),
  );
  if (!Number.isFinite(requestedAt) || Date.now() - requestedAt > 15 * 60_000) {
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      channelPreference: channel,
      dedupeKey,
      payload: payload(
        "La confirmation a expiré. Envoyez d’abord EFFACER, puis EFFACER CONFIRMER dans les 15 minutes.",
      ),
    });
  }
  const { data: erased, error: eraseError } = await admin.rpc(
    "waouh_tel_erase_user",
    {
      p_tel_user_id: telUser.id,
    },
  );
  if (eraseError) {
    throw new Error(`tel_user_erase_failed:${eraseError.message}`);
  }
  if (erased !== true) throw new Error("tel_user_erase_failed:not_found");
  return { erased: true };
}
