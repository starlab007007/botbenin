// Admin approval (or rejection) of a diffusion request
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ ok: false, error: "unauthenticated" }), { status: 401, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ ok: false, error: "forbidden" }), { status: 403, headers: corsHeaders });

    const { approval_id, action, quota_approved, reason, message_template_override } = await req.json();
    if (!approval_id || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid payload" }), { status: 400, headers: corsHeaders });
    }

    const { data: approval, error: gErr } = await admin.from("waouh_diffusion_approvals").select("*").eq("id", approval_id).single();
    if (gErr) throw gErr;
    if (approval.status !== "pending") {
      return new Response(JSON.stringify({ ok: false, error: "already reviewed" }), { status: 409, headers: corsHeaders });
    }

    if (action === "reject") {
      await admin.from("waouh_diffusion_approvals").update({
        status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString(), reason,
      }).eq("id", approval_id);
      if (approval.campaign_id) {
        await admin.from("waouh_radar_campaigns").update({ status: "cancelled" }).eq("id", approval.campaign_id);
      }
      return new Response(JSON.stringify({ ok: true, status: "rejected" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const finalQuota = Math.max(1, Math.min(quota_approved ?? approval.quota_requested, 5000));
    await admin.from("waouh_diffusion_approvals").update({
      status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString(),
      quota_approved: finalQuota, reason,
      message_template: message_template_override ?? approval.message_template,
    }).eq("id", approval_id);

    if (approval.campaign_id) {
      await admin.from("waouh_radar_campaigns").update({
        status: "active",
        quota_approved: finalQuota,
        next_run_at: new Date().toISOString(),
        message_template: message_template_override ?? approval.message_template,
      }).eq("id", approval.campaign_id);

      // Kick the tick
      fetch(`${SUPABASE_URL}/functions/v1/waouh-radar-campaign-tick`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: approval.campaign_id }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, status: "approved", quota_approved: finalQuota }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
