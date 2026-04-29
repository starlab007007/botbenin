// Helpers et templates email spécifiques au système Quiz Guest SIGDSTS
import { sendGuestEmail } from "./guestTicket.ts";

export { sendGuestEmail };

function getBaseUrl(): string {
  const base =
    Deno.env.get("PUBLIC_APP_URL") ??
    "https://id-preview--e22c52ab-372c-49c8-ab35-fb1b4b55f0b1.lovable.app";
  return base.replace(/\/+$/, "");
}

export function buildQuizTrackingUrl(token: string): string {
  return `${getBaseUrl()}/sigdsts/quiz/suivi/${token}`;
}

export function buildQuizVerifyUrl(code: string): string {
  return `${getBaseUrl()}/sigdsts/quiz/verify/${code}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emailQuizAccess(opts: { fullName: string; trackingUrl: string }): string {
  return `
<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a; background:#ffffff;">
  <div style="background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Votre espace de formation SIGDSTS 🎓</h1>
  </div>
  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
    <p>Bonjour ${escapeHtml(opts.fullName)},</p>
    <p>Vous pouvez désormais passer les <strong>évaluations SIGDSTS</strong> et retrouver l'historique de toutes vos tentatives, vos meilleurs scores et vos attestations PDF, depuis n'importe quel appareil — sans créer de compte.</p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${opts.trackingUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Accéder à mes évaluations</a>
    </p>
    <p style="font-size: 13px; color: #6b7280;">Ce lien est strictement personnel et valable <strong>180 jours</strong>. Conservez-le précieusement, il vous sert d'identifiant unique.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">SIGDSTS — Module de formation continue<br>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
  </div>
</body></html>`;
}
