// Crée les jobs d'envoi d'une campagne et passe son statut à `running`.
// Calcule un `scheduled_at` initial qui respecte throttle, délais et plage horaire.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function nextActiveTime(from: Date, startHHmm: string, endHHmm: string, tz: string): Date {
  // On approxime en UTC : tz indicatif. Pour Porto-Novo (UTC+1), on décale d'1h.
  const offsetMin = tz === "Africa/Porto-Novo" ? 60 : 0;
  const d = new Date(from.getTime());
  const local = new Date(d.getTime() + offsetMin * 60000);
  const [sh, sm] = startHHmm.split(":").map(Number);
  const [eh, em] = endHHmm.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const curMin = local.getUTCHours() * 60 + local.getUTCMinutes();
  if (curMin < startMin) {
    local.setUTCHours(sh, sm, 0, 0);
  } else if (curMin >= endMin) {
    local.setUTCDate(local.getUTCDate() + 1);
    local.setUTCHours(sh, sm, 0, 0);
  } else {
    return from;
  }
  return new Date(local.getTime() - offsetMin * 60000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("authorization");
    if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: corsHeaders });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: u } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return new Response(JSON.stringify({ error: "invalid" }), { status: 401, headers: corsHeaders });
    const userId = u.user.id;

    const { campaignId } = await req.json();
    if (!campaignId) return new Response(JSON.stringify({ error: "campaignId required" }), { status: 400, headers: corsHeaders });

    const { data: campaign, error: cErr } = await admin
      .from("wa_campaigns").select("*").eq("id", campaignId).eq("user_id", userId).single();
    if (cErr || !campaign) return new Response(JSON.stringify({ error: "campaign not found" }), { status: 404, headers: corsHeaders });

    // Récupère les contacts ciblés (listes + ad-hoc), exclut opt_out et archived
    const listIds: string[] = campaign.list_ids ?? [];
    const extraIds: string[] = campaign.extra_contact_ids ?? [];

    const contactIds = new Set<string>(extraIds);
    if (listIds.length) {
      const { data: members } = await admin
        .from("wa_contact_list_members").select("contact_id").in("list_id", listIds);
      members?.forEach((m: any) => contactIds.add(m.contact_id));
    }
    if (contactIds.size === 0) {
      return new Response(JSON.stringify({ error: "no contacts in audience" }), { status: 400, headers: corsHeaders });
    }

    const { data: contacts } = await admin
      .from("wa_contacts").select("id, phone_e164, opt_out, archived, is_whatsapp")
      .in("id", [...contactIds]).eq("user_id", userId);
    const valid = (contacts ?? []).filter((c: any) => !c.opt_out && !c.archived && c.is_whatsapp !== false);

    if (valid.length === 0) {
      return new Response(JSON.stringify({ error: "no valid recipients" }), { status: 400, headers: corsHeaders });
    }

    // Planification
    const throttle = Math.max(1, campaign.throttle_per_hour ?? 30);
    const minDelay = Math.max(5, campaign.min_delay_s ?? 25);
    const maxDelay = Math.max(minDelay, campaign.max_delay_s ?? 75);
    const baseStart = campaign.scheduled_at ? new Date(campaign.scheduled_at) : new Date();

    let cursor = baseStart;
    cursor = nextActiveTime(cursor, campaign.active_hours_start.slice(0,5), campaign.active_hours_end.slice(0,5), campaign.timezone);

    const jobs = valid.map((c: any, i: number) => {
      if (i > 0) {
        const gap = minDelay + Math.random() * (maxDelay - minDelay);
        cursor = new Date(cursor.getTime() + gap * 1000);
        cursor = nextActiveTime(cursor, campaign.active_hours_start.slice(0,5), campaign.active_hours_end.slice(0,5), campaign.timezone);
      }
      return {
        campaign_id: campaign.id,
        user_id: userId,
        contact_id: c.id,
        to_phone: c.phone_e164,
        scheduled_at: cursor.toISOString(),
        status: "queued",
      };
    });

    // Insert by batches of 500
    for (let i = 0; i < jobs.length; i += 500) {
      const { error } = await admin.from("wa_send_jobs").insert(jobs.slice(i, i + 500));
      if (error) throw error;
    }

    await admin.from("wa_campaigns").update({ status: "running" }).eq("id", campaign.id);
    await admin.from("wa_campaign_events").insert({
      campaign_id: campaign.id, user_id: userId, level: "info",
      message: `Campagne lancée : ${jobs.length} envois planifiés`,
      payload: { throttle, minDelay, maxDelay },
    });

    return new Response(JSON.stringify({ success: true, scheduled: jobs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), { status: 500, headers: corsHeaders });
  }
});
