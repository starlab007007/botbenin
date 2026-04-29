// Vérification publique d'un certificat SIGDSTS via son code
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse, sha256Hex, getClientIp } from "../_shared/guestTicket.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RATE_WINDOW_MIN = 1;
const RATE_MAX = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let code = "";
    if (req.method === "GET") {
      const u = new URL(req.url);
      code = (u.searchParams.get("code") ?? "").trim().toUpperCase();
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      code = String(body.code ?? "").trim().toUpperCase();
    } else {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (!/^SIG-\d{4}-[A-Z0-9]{6,12}$/.test(code)) {
      return jsonResponse({ status: "invalid_format" }, 400);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Light rate limit
    const ipHash = await sha256Hex(getClientIp(req));
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
    const { count } = await supa
      .from("quiz_public_rate_limit")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if ((count ?? 0) >= RATE_MAX) {
      return jsonResponse({ status: "rate_limited" }, 429);
    }

    const { data, error } = await supa
      .from("quiz_certificate_public")
      .select("certificate_code, holder_name, module_id, module_title, score, total_questions, ratio, mention, certificate_issued_at")
      .eq("certificate_code", code)
      .maybeSingle();

    if (error) throw error;
    if (!data) return jsonResponse({ status: "not_found" }, 404);

    return jsonResponse({ status: "valid", certificate: data });
  } catch (e) {
    console.error("quiz-verify-certificate error", e);
    return jsonResponse({ status: "error", error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
