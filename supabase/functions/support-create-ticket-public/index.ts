// Création publique d'un ticket SIGDSTS sans authentification (Ticket Express)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  corsHeaders,
  jsonResponse,
  generateGuestToken,
  sha256Hex,
  getClientIp,
  verifyCaptcha,
  isValidEmail,
  clean,
  buildTrackingUrl,
  sendGuestEmail,
  emailTicketCreated,
} from "../_shared/guestTicket.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RATE_LIMIT_WINDOW_MIN = 15;
const RATE_LIMIT_MAX_PER_IP = 3;
const RATE_LIMIT_MAX_PER_EMAIL = 5;
const TOKEN_TTL_DAYS = 90;

const ALLOWED_SEVERITY = ["critique", "majeure", "mineure"];
const ALLOWED_CATEGORY = ["incident", "anomalie", "evolution", "question"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot : champ caché qui doit rester vide
    if (typeof body.website === "string" && body.website.length > 0) {
      return jsonResponse({ error: "Bad request" }, 400);
    }

    // Captcha (no-op si HCAPTCHA_SECRET non configuré)
    const captchaOk = await verifyCaptcha(body.captcha_token);
    if (!captchaOk) {
      return jsonResponse({ error: "Vérification captcha échouée" }, 400);
    }

    // Validation des champs obligatoires
    const title = clean(body.title, 200);
    const description = clean(body.description, 5000);
    const guestEmail = clean(body.email, 254);
    const guestName = clean(body.full_name, 100);

    if (!title) return jsonResponse({ error: "Titre requis (max 200 caractères)" }, 400);
    if (!description) return jsonResponse({ error: "Description requise (max 5000 caractères)" }, 400);
    if (!guestEmail || !isValidEmail(guestEmail))
      return jsonResponse({ error: "Email valide requis" }, 400);
    if (!guestName) return jsonResponse({ error: "Nom complet requis" }, 400);

    const severity = ALLOWED_SEVERITY.includes(body.severity) ? body.severity : "mineure";
    const category = ALLOWED_CATEGORY.includes(body.category) ? body.category : "incident";

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate-limit
    const ip = getClientIp(req);
    const ipHash = await sha256Hex(ip);
    const emailHash = await sha256Hex(guestEmail.toLowerCase());
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString();

    const { count: ipCount } = await supa
      .from("support_public_rate_limit")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if ((ipCount ?? 0) >= RATE_LIMIT_MAX_PER_IP) {
      return jsonResponse(
        { error: `Trop de tickets créés. Veuillez réessayer dans ${RATE_LIMIT_WINDOW_MIN} minutes.` },
        429,
      );
    }

    const { count: emailCount } = await supa
      .from("support_public_rate_limit")
      .select("*", { count: "exact", head: true })
      .eq("email_hash", emailHash)
      .gte("created_at", since);

    if ((emailCount ?? 0) >= RATE_LIMIT_MAX_PER_EMAIL) {
      return jsonResponse(
        { error: `Trop de tickets pour cet email. Réessayez dans ${RATE_LIMIT_WINDOW_MIN} minutes.` },
        429,
      );
    }

    // Génération du token + insert ticket
    const token = generateGuestToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 86400_000).toISOString();

    const { data: ticket, error: insertErr } = await supa
      .from("support_tickets")
      .insert({
        user_id: null,
        title,
        description,
        category,
        severity,
        module: clean(body.module, 100),
        site: clean(body.site, 100),
        profile: clean(body.profile, 100),
        reproduction_steps: clean(body.reproduction_steps, 5000),
        attachments: [],
        origin: "guest_express",
        guest_email: guestEmail.toLowerCase(),
        guest_full_name: guestName,
        guest_phone: clean(body.phone, 30),
        guest_token_hash: tokenHash,
        guest_token_expires: expiresAt,
      })
      .select("*")
      .single();

    if (insertErr || !ticket) {
      console.error("ticket insert error", insertErr);
      return jsonResponse(
        { error: insertErr?.message ?? "Création du ticket impossible" },
        500,
      );
    }

    // Premier message
    await supa.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: null,
      author_role: "guest",
      message: description,
      is_internal_note: false,
    });

    // SLA event
    await supa.from("support_sla_events").insert({
      ticket_id: ticket.id,
      event_type: "sla_set",
      threshold_minutes:
        severity === "critique" ? 120 : severity === "majeure" ? 240 : 1440,
    });

    // Rate-limit log
    await supa.from("support_public_rate_limit").insert({
      ip_hash: ipHash,
      email_hash: emailHash,
    });

    // Email transactionnel
    const trackingUrl = buildTrackingUrl(token);
    const emailResult = await sendGuestEmail({
      to: guestEmail,
      subject: `Ticket SIGDSTS ${ticket.ticket_number ?? ""} reçu — Suivez votre demande`,
      html: emailTicketCreated({
        ticketNumber: ticket.ticket_number ?? ticket.id,
        title,
        severity,
        trackingUrl,
      }),
    });

    return jsonResponse({
      ticket_number: ticket.ticket_number,
      tracking_url: trackingUrl,
      email_sent: emailResult.ok,
      email_error: emailResult.ok ? undefined : emailResult.error,
      // Le token est aussi renvoyé pour affichage immédiat (au cas où l'email tarde / échoue)
      token,
    }, 201);
  } catch (e) {
    console.error("support-create-ticket-public error", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});
