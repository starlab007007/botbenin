// Admin approval (or rejection) of a diffusion request
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  ,
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
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role_name: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ ok: false, error: "forbidden" }), { status: 403, headers: corsHeaders });

    const { approval_id, action, quota_approved, reason, message_template_override,
            audience_recipients, excluded_phones } = await req.json();
    if (!approval_id || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid payload" }), { status: 400, headers: corsHeaders });
    }

    const { data: approval, error: gErr } = await admin.from("waouh_diffusion_approvals").select("*").eq("id", approval_id).single();
    if (gErr) throw gErr;
    if (approval.status !== "pending") {
      return new Response(JSON.stringify({ ok: false, error: "already reviewed" }), { status: 409, headers: corsHeaders });
    }

    // Sanitize recipients (E.164-ish validation)
    const E164 = /^\+?[1-9]\d{7,14}$/;
    let cleanRecipients: any[] | undefined;
    if (Array.isArray(audience_recipients)) {
      cleanRecipients = audience_recipients
        .filter((r: any) => r && typeof r === "object")
        .map((r: any) => {
          const phone = String(r.override_phone ?? r.phone_e164 ?? "").replace(/[^\d+]/g, "");
          return {
            phone_e164: phone,
            name: r.name ?? r.display_name ?? "",
            secteur: r.secteur ?? null,
            classe: r.classe ?? null,
            ville: r.ville ?? null,
            included: r.included !== false && E164.test(phone),
          };
        })
        .filter((r: any) => E164.test(r.phone_e164));
    }
    const cleanExcluded = Array.isArray(excluded_phones)
      ? excluded_phones.map((p: any) => String(p).replace(/[^\d+]/g, "")).filter((p: string) => E164.test(p))
      : undefined;

    if (action === "reject") {
      await admin.from("waouh_diffusion_approvals").update({
        status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString(), reason,
      }).eq("id", approval_id);
      if (approval.campaign_id) {
        await admin.from("waouh_radar_campaigns").update({ status: "cancelled" }).eq("id", approval.campaign_id);
      }
      return new Response(JSON.stringify({ ok: true, status: "rejected" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // If admin curated a recipient list, use its included-count as the natural quota cap
    const includedCount = cleanRecipients?.filter((r: any) => r.included).length ?? 0;
    const requestedQuota = quota_approved ?? approval.quota_requested;
    const finalQuota = Math.max(1, Math.min(
      includedCount > 0 ? Math.min(requestedQuota, includedCount) : requestedQuota,
      5000
    ));

    const updatePayload: any = {
      status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString(),
      quota_approved: finalQuota, reason,
      message_template: message_template_override ?? approval.message_template,
    };
    if (cleanRecipients) updatePayload.audience_recipients = cleanRecipients;
    if (cleanExcluded) updatePayload.excluded_phones = cleanExcluded;
    await admin.from("waouh_diffusion_approvals").update(updatePayload).eq("id", approval_id);

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
