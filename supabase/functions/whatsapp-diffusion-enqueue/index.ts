import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVE_STATUSES = new Set(["WORKING", "connected"]);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function nextActiveTime(from: Date, startHHmm: string, endHHmm: string, tz: string): Date {
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
    if (!auth) return json({ ok: false, error: "Utilisateur non authentifié" }, 401);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: u } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ ok: false, error: "Session utilisateur invalide" }, 401);
    const userId = u.user.id;

    const { campaignId } = await req.json().catch(() => ({}));
    if (!campaignId) return json({ ok: false, error: "campaignId requis" });

    const { data: campaign, error: cErr } = await admin
      .from("wa_campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single();
    if (cErr || !campaign) return json({ ok: false, error: "Campagne introuvable" });

    const { data: session } = await admin
      .from("whatsapp_accounts")
      .select("id, session_name, status")
      .eq("id", campaign.session_id)
      .maybeSingle();

    if (!session) {
      await admin.from("wa_campaigns").update({ status: "failed", stats: { total: 0, failed: 0, queued: 0, sent: 0 } }).eq("id", campaign.id);
      return json({ ok: false, code: "NO_SESSION", error: "La campagne n’a pas de session WhatsApp valide." });
    }

    if (!ACTIVE_STATUSES.has(session.status)) {
      await admin.from("wa_campaigns").update({ status: "failed", stats: { total: 0, failed: 0, queued: 0, sent: 0 } }).eq("id", campaign.id);
      await admin.from("wa_campaign_events").insert({
        campaign_id: campaign.id,
        user_id: userId,
        level: "error",
        message: `Session ${session.session_name} déconnectée (${session.status})`,
        payload: { sessionId: session.id, status: session.status },
      });
      return json({ ok: false, code: "SESSION_DISCONNECTED", error: `La session ${session.session_name} est ${session.status}. Reconnectez-la avant de lancer la campagne.` });
    }

    const { count: existingCount } = await admin
      .from("wa_send_jobs")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id);

    if ((existingCount ?? 0) > 0) {
      return json({ ok: true, success: true, scheduled: 0, existing: existingCount, message: "Cette campagne a déjà des envois planifiés." });
    }

    const listIds: string[] = campaign.list_ids ?? [];
    const extraIds: string[] = campaign.extra_contact_ids ?? [];
    const contactIds = new Set<string>(extraIds);

    if (listIds.length) {
      const { data: members } = await admin.from("wa_contact_list_members").select("contact_id").in("list_id", listIds);
      members?.forEach((m: any) => contactIds.add(m.contact_id));
    }

    if (contactIds.size === 0) return json({ ok: false, error: "Aucun contact dans l’audience" });

    const { data: contacts, error: contactsError } = await admin
      .from("wa_contacts")
      .select("id, phone_e164, opt_out, archived, is_whatsapp")
      .in("id", [...contactIds])
      .eq("user_id", userId);
    if (contactsError) throw contactsError;

    const valid = (contacts ?? []).filter((c: any) => !c.opt_out && !c.archived && c.is_whatsapp !== false);
    const excluded = (contacts ?? []).length - valid.length;

    if (valid.length === 0) {
      await admin.from("wa_campaigns").update({ status: "failed", stats: { total: 0, failed: 0, queued: 0, sent: 0, excluded } }).eq("id", campaign.id);
      return json({ ok: false, error: "Aucun destinataire valide. Vérifiez WhatsApp ou retirez les contacts opt-out/archivés." });
    }

    const throttle = Math.max(1, campaign.throttle_per_hour ?? 30);
    const minDelay = Math.max(5, campaign.min_delay_s ?? 25);
    const maxDelay = Math.max(minDelay, campaign.max_delay_s ?? 75);
    let cursor = campaign.scheduled_at ? new Date(campaign.scheduled_at) : new Date();
    cursor = nextActiveTime(cursor, campaign.active_hours_start.slice(0, 5), campaign.active_hours_end.slice(0, 5), campaign.timezone);

    const jobs = valid.map((c: any, i: number) => {
      if (i > 0) {
        const gap = minDelay + Math.random() * (maxDelay - minDelay);
        cursor = new Date(cursor.getTime() + gap * 1000);
        cursor = nextActiveTime(cursor, campaign.active_hours_start.slice(0, 5), campaign.active_hours_end.slice(0, 5), campaign.timezone);
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

    for (let i = 0; i < jobs.length; i += 500) {
      const { error } = await admin.from("wa_send_jobs").insert(jobs.slice(i, i + 500));
      if (error) throw error;
    }

    const stats = { total: jobs.length, queued: jobs.length, sending: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, skipped: 0, pending: jobs.length, excluded };
    await admin.from("wa_campaigns").update({ status: "running", stats }).eq("id", campaign.id);
    await admin.from("wa_campaign_events").insert({
      campaign_id: campaign.id,
      user_id: userId,
      level: "info",
      message: `Campagne lancée : ${jobs.length} envois planifiés`,
      payload: { throttle, minDelay, maxDelay, excluded },
    });

    return json({ ok: true, success: true, scheduled: jobs.length, excluded });
  } catch (e: any) {
    console.error("whatsapp-diffusion-enqueue failed", e);
    return json({ ok: false, error: e?.message ?? "Erreur inconnue pendant la planification", fallback: true });
  }
});
