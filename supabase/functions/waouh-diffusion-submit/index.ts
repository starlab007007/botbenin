// Submit a diffusion campaign for admin approval
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
    const body = await req.json();
    const { name, message_template, media_url, article_id, mode = "announcement", filters = {}, quota_requested = 100, audience_snapshot = {} } = body;
    if (!message_template) return new Response(JSON.stringify({ ok: false, error: "message_template required" }), { status: 400, headers: corsHeaders });

    // Create campaign in paused state
    const { data: campaign, error: cErr } = await admin.from("waouh_radar_campaigns").insert({
      name: name ?? "Diffusion sans titre",
      mode, message_template, media_url, article_id,
      segment: filters,
      schedule: { type: "one_shot" },
      status: "paused",
      requires_approval: true,
      created_by: user.id,
    }).select().single();
    if (cErr) throw cErr;

    const { data: approval, error: aErr } = await admin.from("waouh_diffusion_approvals").insert({
      campaign_id: campaign.id,
      requested_by: user.id,
      audience_filters: filters,
      audience_snapshot,
      message_template, media_url,
      quota_requested,
      status: "pending",
    }).select().single();
    if (aErr) throw aErr;

    await admin.from("waouh_radar_campaigns").update({ approval_id: approval.id }).eq("id", campaign.id);

    return new Response(JSON.stringify({ ok: true, campaign_id: campaign.id, approval_id: approval.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
