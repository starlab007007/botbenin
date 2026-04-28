// Création / récupération d'un candidat quiz guest + envoi du lien magique
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
} from "../_shared/guestTicket.ts";
import { buildQuizTrackingUrl, emailQuizAccess, sendGuestEmail } from "../_shared/guestQuiz.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RATE_LIMIT_WINDOW_MIN = 15;
const RATE_LIMIT_MAX_PER_IP = 5;
const RATE_LIMIT_MAX_PER_EMAIL = 5;
const TOKEN_TTL_DAYS = 180;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.website === "string" && body.website.length > 0) {
      return jsonResponse({ error: "Bad request" }, 400);
    }
    const captchaOk = await verifyCaptcha(body.captcha_token);
    if (!captchaOk) return jsonResponse({ error: "Captcha invalide" }, 400);

    const email = clean(body.email, 254);
    const fullName = clean(body.full_name, 100);
    const phone = clean(body.phone, 30);
    const organization = clean(body.organization, 150);

    if (!email || !isValidEmail(email)) return jsonResponse({ error: "Email valide requis" }, 400);
    if (!fullName) return jsonResponse({ error: "Nom complet requis" }, 400);

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ip = getClientIp(req);
    const ipHash = await sha256Hex(ip);
    const emailLower = email.toLowerCase();
    const emailHash = await sha256Hex(emailLower);
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString();

    const { count: ipCount } = await supa
      .from("quiz_public_rate_limit")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if ((ipCount ?? 0) >= RATE_LIMIT_MAX_PER_IP) {
      return jsonResponse({ error: `Trop de demandes. Réessayez dans ${RATE_LIMIT_WINDOW_MIN} minutes.` }, 429);
    }
    const { count: emailCount } = await supa
      .from("quiz_public_rate_limit")
      .select("*", { count: "exact", head: true })
      .eq("email_hash", emailHash)
      .gte("created_at", since);
    if ((emailCount ?? 0) >= RATE_LIMIT_MAX_PER_EMAIL) {
      return jsonResponse({ error: `Trop de demandes pour cet email. Réessayez plus tard.` }, 429);
    }

    // Génère un nouveau token (rotation à chaque demande pour sécurité)
    const token = generateGuestToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 86400_000).toISOString();

    // Upsert sur lower(email) — on cherche d'abord par email
    const { data: existing } = await supa
      .from("quiz_candidates")
      .select("id")
      .ilike("email", emailLower)
      .maybeSingle();

    let candidateId: string;
    if (existing) {
      const { error: upErr } = await supa
        .from("quiz_candidates")
        .update({
          full_name: fullName,
          phone,
          organization,
          guest_token_hash: tokenHash,
          guest_token_expires: expiresAt,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (upErr) throw upErr;
      candidateId = existing.id;
    } else {
      const { data: created, error: insErr } = await supa
        .from("quiz_candidates")
        .insert({
          email: emailLower,
          full_name: fullName,
          phone,
          organization,
          guest_token_hash: tokenHash,
          guest_token_expires: expiresAt,
        })
        .select("id")
        .single();
      if (insErr || !created) throw insErr ?? new Error("Insert failed");
      candidateId = created.id;
    }

    await supa.from("quiz_public_rate_limit").insert({ ip_hash: ipHash, email_hash: emailHash });

    const trackingUrl = buildQuizTrackingUrl(token);
    const emailResult = await sendGuestEmail({
      to: email,
      subject: "Votre espace de formation SIGDSTS",
      html: emailQuizAccess({ fullName, trackingUrl }),
    });

    return jsonResponse({
      candidate_id: candidateId,
      token,
      tracking_url: trackingUrl,
      email_sent: emailResult.ok,
      email_error: emailResult.ok ? undefined : emailResult.error,
    }, 201);
  } catch (e) {
    console.error("quiz-guest-start error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
