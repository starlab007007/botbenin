// WAOUH Chat Reconcile — Phase 5 du plan du 27/09/2026.
// Déclenche la réconciliation waouh_reconcile_chat_integrity() à la demande.
//   POST { mode: "report" }  (défaut) : mesure, aucune écriture — admin requis
//   POST { mode: "apply" }            : réparations sûres — admin requis
// Le cron (toutes les 15 min) appelle directement la fonction SQL en mode
// "auto" ; cette edge function sert au bouton admin et au diagnostic manuel.
// Le taux de commission n'est jamais deviné : WAOUH_COMMISSION_RATE, comme
// waouh-negotiation-router (utile à la règle R6 uniquement).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const COMMISSION_RATE_RAW = Deno.env.get("WAOUH_COMMISSION_RATE");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function commissionRate(): number | null {
  if (COMMISSION_RATE_RAW == null || COMMISSION_RATE_RAW === "") return null; // R6 reste en rapport sans taux explicite
  const value = Number(COMMISSION_RATE_RAW);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;
}

async function isAdminRequest(req: Request, sb: any): Promise<boolean> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  if (auth.slice(7).trim() === SERVICE_ROLE) return true;
  try {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return false;
    const [admin, superAdmin] = await Promise.all([
      sb.rpc("has_role", { _user_id: user.id, _role_name: "admin" }),
      sb.rpc("has_role", { _user_id: user.id, _role_name: "super_admin" }),
    ]);
    return admin.data === true || superAdmin.data === true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  if (!(await isAdminRequest(req, sb))) {
    return json({ ok: false, error: "admin_required" }, 403);
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const mode = String(body.mode ?? "report").toLowerCase();
  if (mode !== "report" && mode !== "apply") {
    return json({ ok: false, error: "invalid_mode", allowed: ["report", "apply"] }, 400);
  }

  const { data, error } = await sb.rpc("waouh_reconcile_chat_integrity", {
    p_mode: mode,
    p_commission_rate: mode === "apply" ? commissionRate() : null,
  });
  if (error) {
    console.error("[waouh-chat-reconcile]", error);
    return json({ ok: false, error: error.message ?? String(error) }, 500);
  }
  return json(data ?? { ok: true });
});
