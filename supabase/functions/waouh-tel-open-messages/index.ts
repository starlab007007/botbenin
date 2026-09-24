import {
  createTelAdminClient,
  getTelSettings,
} from "../_shared/waouh-tel/config.ts";
import { formatPhoneDisplay } from "../_shared/waouh-tel/phone.ts";
import { findActiveInvite } from "../_shared/waouh-tel/invites.ts";
import { sha256Hex } from "../_shared/waouh-tel/crypto.ts";
import {
  methodNotAllowed,
  telCorsHeaders,
  telError,
  telOk,
} from "../_shared/waouh-tel/http.ts";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (
      char,
    ) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    }[char]!),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: telCorsHeaders(req) });
  }
  if (req.method !== "GET") return methodNotAllowed(req);
  try {
    const admin = createTelAdminClient();
    const settings = await getTelSettings(admin);
    if (!settings.enabled) {
      return telError(
        503,
        "native_messaging_disabled",
        "WAOUH Native Messaging est désactivé.",
        undefined,
        req,
      );
    }
    if (!settings.business_phone_e164) {
      return telError(
        404,
        "number_not_configured",
        "Le numéro WAOUH n'est pas encore configuré.",
        undefined,
        req,
      );
    }
    const url = new URL(req.url);
    const invite = (url.searchParams.get("invite") || "").toUpperCase().replace(
      /[^A-Z0-9]/g,
      "",
    ).slice(0, 32);
    const roomCode = (url.searchParams.get("room") || "").toUpperCase().replace(
      /[^A-Z0-9]/g,
      "",
    ).slice(0, 12);
    let defaultMessage = (url.searchParams.get("message") || "BONJOUR WAOUH")
      .trim().slice(0, 160);
    if (invite) {
      const valid = await findActiveInvite(admin, invite);
      if (!valid) {
        return telError(
          404,
          "invite_invalid",
          "Invitation invalide ou expirée.",
          undefined,
          req,
        );
      }
      defaultMessage = `BONJOUR ${invite}`;
    }
    if (roomCode) {
      const { data: room } = await admin.from("waouh_tel_rooms").select("id")
        .eq("code_hash", await sha256Hex(roomCode)).eq("status", "active")
        .maybeSingle();
      if (!room) {
        return telError(
          404,
          "room_invalid",
          "Groupe invalide ou archivé.",
          undefined,
          req,
        );
      }
      defaultMessage = `REJOINDRE ${roomCode}`;
    }
    const encodedMessage = encodeURIComponent(defaultMessage);
    const smsUriAndroid =
      `sms:${settings.business_phone_e164}?body=${encodedMessage}`;
    const smsUriIos =
      `sms:${settings.business_phone_e164}&body=${encodedMessage}`;
    const isIos = /iPhone|iPad|iPod/i.test(req.headers.get("user-agent") || "");
    const smsUri = isIos ? smsUriIos : smsUriAndroid;
    const data = {
      enabled: true,
      phone_e164: settings.business_phone_e164,
      phone_display: settings.business_phone_display ||
        formatPhoneDisplay(settings.business_phone_e164),
      sender_name: settings.rcs_sender_name,
      sms_uri: smsUri,
      sms_uri_android: smsUriAndroid,
      sms_uri_ios: smsUriIos,
      default_message: defaultMessage,
      rcs_enabled: settings.rcs_enabled,
      sms_enabled: settings.sms_enabled,
      virtual_groups_enabled: settings.virtual_groups_enabled,
    };
    const wantsHtml = url.searchParams.get("format") === "html" ||
      (req.headers.get("accept") || "").includes("text/html");
    if (!wantsHtml) return telOk(data, 200, req);
    const html =
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Écrire à WAOUH</title><style>body{font-family:system-ui,sans-serif;max-width:38rem;margin:4rem auto;padding:1.5rem;color:#12352a}a{display:inline-block;background:#087f5b;color:white;padding:.9rem 1.2rem;border-radius:.75rem;text-decoration:none;font-weight:700}.n{font-size:1.4rem;font-weight:700}</style></head><body><h1>WAOUH Messages</h1><p>Écrivez à WAOUH depuis l'application Messages de votre téléphone.</p><p class="n">${
        escapeHtml(data.phone_display)
      }</p><p>Message : <strong>${
        escapeHtml(defaultMessage)
      }</strong></p><p><a href="${
        escapeHtml(smsUri)
      }">Ouvrir Messages</a></p></body></html>`;
    return new Response(html, {
      status: 200,
      headers: {
        ...telCorsHeaders(req),
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return telError(
      500,
      "open_messages_internal_error",
      "Impossible de préparer l'ouverture de Messages.",
      error instanceof Error ? error.message : String(error),
      req,
    );
  }
});
