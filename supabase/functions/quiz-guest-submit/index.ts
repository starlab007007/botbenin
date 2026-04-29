// Enregistrement d'une tentative de quiz par un candidat guest
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse, sha256Hex, getClientIp, clean } from "../_shared/guestTicket.ts";
import { buildQuizVerifyUrl } from "../_shared/guestQuiz.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_MENTIONS = ["excellent", "good", "review"];

function generateCertificateCode(): string {
  const year = new Date().getFullYear();
  // 8 chars base32 (no I/O/0/1 to avoid confusion)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `SIG-${year}-${s}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    if (token.length < 16 || token.length > 128) return jsonResponse({ error: "Token invalide" }, 400);

    const moduleId = typeof body.module_id === "string" ? body.module_id.slice(0, 80) : "";
    const moduleTitle = typeof body.module_title === "string" ? body.module_title.slice(0, 200) : "";
    const total = Number(body.total_questions);
    const score = Number(body.score);
    const mention = String(body.mention ?? "");
    const duration = body.duration_seconds == null ? null : Math.max(0, Math.min(86400, Number(body.duration_seconds) | 0));
    const certificateIssued = !!body.certificate_issued;
    const holderName = clean(body.holder_name, 120);
    const answers = Array.isArray(body.answers) ? body.answers.slice(0, 200) : [];

    if (!moduleId || !moduleTitle) return jsonResponse({ error: "Module requis" }, 400);
    if (!Number.isFinite(total) || total < 1 || total > 200) return jsonResponse({ error: "total_questions invalide" }, 400);
    if (!Number.isFinite(score) || score < 0 || score > total) return jsonResponse({ error: "score invalide" }, 400);
    if (!ALLOWED_MENTIONS.includes(mention)) return jsonResponse({ error: "mention invalide" }, 400);

    const tokenHash = await sha256Hex(token);
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: candidate, error: candErr } = await supa
      .from("quiz_candidates")
      .select("id, full_name, guest_token_expires")
      .eq("guest_token_hash", tokenHash)
      .maybeSingle();
    if (candErr) throw candErr;
    if (!candidate) return jsonResponse({ error: "Token inconnu" }, 404);
    if (candidate.guest_token_expires && new Date(candidate.guest_token_expires) < new Date()) {
      return jsonResponse({ error: "Lien expiré, demandez un nouveau lien." }, 410);
    }

    const ipHash = await sha256Hex(getClientIp(req));
    const ua = (req.headers.get("user-agent") ?? "").slice(0, 250);
    const passed = score / total >= 0.7;

    let certificateCode: string | null = null;
    let certificateIssuedAt: string | null = null;
    let storedHolderName: string | null = null;

    if (certificateIssued && passed) {
      certificateCode = generateCertificateCode();
      certificateIssuedAt = new Date().toISOString();
      storedHolderName = holderName ?? candidate.full_name ?? null;
    }

    const { data: attempt, error: insErr } = await supa
      .from("quiz_attempts")
      .insert({
        candidate_id: candidate.id,
        module_id: moduleId,
        module_title: moduleTitle,
        total_questions: total,
        score,
        mention,
        passed,
        duration_seconds: duration,
        answers,
        certificate_issued: certificateIssued && passed,
        certificate_code: certificateCode,
        certificate_issued_at: certificateIssuedAt,
        holder_name: storedHolderName,
        ip_hash: ipHash,
        user_agent: ua,
      })
      .select("id, created_at, certificate_code, certificate_issued_at")
      .single();
    if (insErr || !attempt) throw insErr ?? new Error("Insert failed");

    await supa
      .from("quiz_candidates")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", candidate.id);

    return jsonResponse({
      attempt_id: attempt.id,
      created_at: attempt.created_at,
      certificate_code: attempt.certificate_code,
      certificate_issued_at: attempt.certificate_issued_at,
      verify_url: attempt.certificate_code ? buildQuizVerifyUrl(attempt.certificate_code) : null,
    }, 201);
  } catch (e) {
    console.error("quiz-guest-submit error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
