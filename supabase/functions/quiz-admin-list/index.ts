// Liste admin de toutes les tentatives + KPIs
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse } from "../_shared/guestTicket.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    // Vérification admin via le JWT du caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = claimsRes.claims.sub;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role_name: "admin" });
    if (!isAdmin) return jsonResponse({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const search = typeof body.search === "string" ? body.search.trim().slice(0, 100) : "";
    const moduleId = typeof body.module_id === "string" ? body.module_id : "";
    const mention = typeof body.mention === "string" ? body.mention : "";
    const from = typeof body.from === "string" ? body.from : "";
    const to = typeof body.to === "string" ? body.to : "";
    const limit = Math.min(1000, Math.max(1, Number(body.limit) || 200));

    let q = admin
      .from("quiz_admin_attempts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (moduleId) q = q.eq("module_id", moduleId);
    if (mention) q = q.eq("mention", mention);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);
    if (search) {
      q = q.or(
        `candidate_email.ilike.%${search}%,candidate_name.ilike.%${search}%,module_title.ilike.%${search}%`,
      );
    }

    const { data: rows, error: qErr } = await q;
    if (qErr) throw qErr;

    // KPIs
    const { count: candidateCount } = await admin
      .from("quiz_candidates")
      .select("*", { count: "exact", head: true });
    const { count: attemptCount } = await admin
      .from("quiz_attempts")
      .select("*", { count: "exact", head: true });

    return jsonResponse({
      attempts: rows ?? [],
      kpis: {
        total_candidates: candidateCount ?? 0,
        total_attempts: attemptCount ?? 0,
        returned: rows?.length ?? 0,
      },
    });
  } catch (e) {
    console.error("quiz-admin-list error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
