// Historique d'un candidat guest via son token magique
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse, sha256Hex } from "../_shared/guestTicket.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const { token } = await req.json().catch(() => ({}));
    if (typeof token !== "string" || token.length < 16 || token.length > 128) {
      return jsonResponse({ error: "Token invalide" }, 400);
    }
    const tokenHash = await sha256Hex(token);
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: candidate, error: cErr } = await supa
      .from("quiz_candidates")
      .select("id, email, full_name, phone, organization, guest_token_expires, created_at, last_activity_at")
      .eq("guest_token_hash", tokenHash)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!candidate) return jsonResponse({ error: "Lien invalide" }, 404);
    if (candidate.guest_token_expires && new Date(candidate.guest_token_expires) < new Date()) {
      return jsonResponse({ error: "Lien expiré" }, 410);
    }

    const { data: attempts } = await supa
      .from("quiz_attempts")
      .select("id, module_id, module_title, total_questions, score, ratio, mention, passed, duration_seconds, certificate_issued, created_at")
      .eq("candidate_id", candidate.id)
      .order("created_at", { ascending: false })
      .limit(500);

    return jsonResponse({ candidate, attempts: attempts ?? [] });
  } catch (e) {
    console.error("quiz-guest-history error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
