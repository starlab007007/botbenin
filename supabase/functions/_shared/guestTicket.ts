// Helpers partagés pour le système Ticket Express (guest tickets)

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-waouh-session",
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Génère un token aléatoire URL-safe (base64url) de 32 octets
export function generateGuestToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ??
    "unknown"
  );
}

// Validation hCaptcha (no-op si HCAPTCHA_SECRET non défini = mode honeypot only)
export async function verifyCaptcha(token: string | undefined | null): Promise<boolean> {
  const secret = Deno.env.get("HCAPTCHA_SECRET");
  if (!secret) return true; // mode dégradé : pas de captcha configuré
  if (!token) return false;
  try {
    const params = new URLSearchParams({ secret, response: token });
    const r = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const j = await r.json();
    return !!j.success;
  } catch {
    return false;
  }
}

// Validation simple d'email
export function isValidEmail(s: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,253}\.[a-zA-Z]{2,}$/.test(s);
}

// Sanitize string: trim + max length
export function clean(s: unknown, max: number): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  return t.slice(0, max);
}

// Construit l'URL publique de suivi du ticket
export function buildTrackingUrl(token: string): string {
  const base =
    Deno.env.get("PUBLIC_APP_URL") ??
    "https://id-preview--e22c52ab-372c-49c8-ab35-fb1b4b55f0b1.lovable.app";
  return `${base.replace(/\/+$/, "")}/sigdsts/t/${token}`;
}

// Envoi d'email via Resend (best-effort : ne bloque pas le retour si échec)
export async function sendGuestEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("SUPPORT_EMAIL_FROM") ?? "Support SIGDSTS <onboarding@resend.dev>";
  let resendError: string | undefined;

  if (!apiKey) resendError = "RESEND_API_KEY not configured";

  if (apiKey) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
      });
      if (r.ok) return { ok: true };
      const text = await r.text();
      resendError = `Resend ${r.status}: ${text}`;
    } catch (e) {
      resendError = e instanceof Error ? e.message : "unknown";
    }
  }

  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
  const gmailEmail = Deno.env.get("GMAIL_EMAIL") ?? "bot.bjdata@gmail.com";
  if (!gmailPassword) return { ok: false, error: resendError ?? "No email provider configured" };

  try {
    const nodemailer = await import("npm:nodemailer@6.9.16");
    const transporter = nodemailer.default.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailEmail, pass: gmailPassword },
    });
    await transporter.sendMail({ from: `SIGDSTS <${gmailEmail}>`, to: opts.to, subject: opts.subject, html: opts.html });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Resend: ${resendError ?? "skipped"}; Gmail SMTP: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

// Templates d'email
export function emailTicketCreated(opts: {
  ticketNumber: string;
  title: string;
  severity: string;
  trackingUrl: string;
}): string {
  const slaMap: Record<string, string> = {
    critique: "≤ 2 heures",
    majeure: "≤ 4 heures",
    mineure: "≤ 24 heures",
  };
  const sla = slaMap[opts.severity] ?? "selon sévérité";
  return `
<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <div style="background: linear-gradient(135deg, #059669, #2563eb); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Ticket SIGDSTS reçu ✓</h1>
    <p style="margin: 8px 0 0; opacity: 0.95;">Numéro : <strong>${opts.ticketNumber}</strong></p>
  </div>
  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
    <p>Bonjour,</p>
    <p>Votre demande a bien été enregistrée dans le système de support SIGDSTS.</p>
    <div style="background: #f9fafb; border-left: 4px solid #059669; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Sujet :</strong> ${escapeHtml(opts.title)}</p>
      <p style="margin: 8px 0 0;"><strong>Sévérité :</strong> ${opts.severity} — SLA ${sla}</p>
    </div>
    <p>Pour suivre l'évolution de votre ticket, ajouter des informations ou répondre à un agent, utilisez votre lien de suivi personnel :</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${opts.trackingUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Suivre mon ticket</a>
    </p>
    <p style="font-size: 13px; color: #6b7280;">Ce lien est strictement personnel et valable 90 jours. Ne le partagez pas.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">SIGDSTS — Support Technique<br>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
  </div>
</body></html>`;
}

export function emailTicketReply(opts: {
  ticketNumber: string;
  title: string;
  agentMessage: string;
  trackingUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">Nouvelle réponse — ${opts.ticketNumber}</h1>
  </div>
  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
    <p>Bonjour,</p>
    <p>Un agent du support N2 a répondu à votre ticket <strong>${escapeHtml(opts.title)}</strong> :</p>
    <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(opts.agentMessage)}</div>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${opts.trackingUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Voir et répondre</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">SIGDSTS — Support Technique</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
