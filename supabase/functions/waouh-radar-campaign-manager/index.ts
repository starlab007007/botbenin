// Admin endpoint: CRUD for Radar IA scheduled campaigns + segment preview.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function jerr(message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function jok(data: any) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function assertAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) throw jerr("Authentification requise", 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) throw jerr("Session invalide", 401);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isAdmin, error } = await admin.rpc("has_role", { _user_id: user.id, _role_name: "admin" });
  if (error) throw jerr(`Vérification admin impossible: ${error.message}`, 500);
  if (!isAdmin) throw jerr("Accès admin requis", 403);
  return { admin, userId: user.id };
}

// Compute next_run_at based on schedule
function computeNextRun(schedule: any, from: Date = new Date()): string | null {
  const type = schedule?.type || "one_shot";
  if (type === "one_shot") {
    return schedule?.run_at || from.toISOString();
  }
  const hour = parseInt(schedule?.hour ?? "10", 10);
  const minute = parseInt(schedule?.minute ?? "0", 10);
  const tz = schedule?.timezone || "UTC"; // simplification: treat as UTC offset 0
  const days: number[] = Array.isArray(schedule?.days_of_week) ? schedule.days_of_week.map((d: any) => parseInt(d, 10)) : [];

  const next = new Date(from);
  next.setUTCSeconds(0, 0);
  next.setUTCHours(hour, minute, 0, 0);

  if (type === "daily") {
    if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString();
  }
  if (type === "weekly") {
    if (!days.length) days.push(1); // Monday default
    for (let i = 0; i < 8; i++) {
      const candidate = new Date(next);
      candidate.setUTCDate(next.getUTCDate() + i);
      if (days.includes(candidate.getUTCDay()) && candidate > from) {
        return candidate.toISOString();
      }
    }
  }
  return null;
}

// Build query for segment preview / resolve
async function resolveSegment(admin: any, segment: any) {
  let q = admin.from("waouh_radar_contacts").select("id, phone_e164_normalized, display_name, categories, cities, status, last_seen_at, signal_count, intent_buy_count, intent_sell_count", { count: "exact" });
  q = q.in("status", ["new", "opted_in"]);
  q = q.not("phone_e164_normalized", "is", null);

  if (Array.isArray(segment?.categories) && segment.categories.length) {
    q = q.overlaps("categories", segment.categories);
  }
  if (Array.isArray(segment?.cities) && segment.cities.length) {
    q = q.overlaps("cities", segment.cities);
  }
  if (segment?.min_signals && segment.min_signals > 0) {
    q = q.gte("signal_count", segment.min_signals);
  }
  if (segment?.last_seen_within_days && segment.last_seen_within_days > 0) {
    const since = new Date(Date.now() - segment.last_seen_within_days * 86400000).toISOString();
    q = q.gte("last_seen_at", since);
  }
  if (segment?.intent === "BUY") q = q.gt("intent_buy_count", 0);
  if (segment?.intent === "SELL") q = q.gt("intent_sell_count", 0);

  return q;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { admin, userId } = await assertAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";

    if (action === "list") {
      const { data, error } = await admin.from("waouh_radar_campaigns")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      // Aggregate stats
      const ids = (data || []).map((c: any) => c.id);
      let stats: Record<string, any> = {};
      if (ids.length) {
        const { data: sends } = await admin.from("waouh_radar_campaign_sends")
          .select("campaign_id, status").in("campaign_id", ids);
        for (const s of sends || []) {
          const k = s.campaign_id;
          stats[k] = stats[k] || { total: 0, sent: 0, replied: 0, failed: 0, opted_out: 0 };
          stats[k].total++;
          if (["sent","delivered","read"].includes(s.status)) stats[k].sent++;
          if (s.status === "replied") stats[k].replied++;
          if (s.status === "failed") stats[k].failed++;
          if (s.status === "opted_out") stats[k].opted_out++;
        }
      }
      return jok({ campaigns: data, stats });
    }

    if (action === "preview_segment") {
      const q = await resolveSegment(admin, body.segment || {});
      const { data: sample, count, error } = await q.range(0, 9);
      if (error) throw error;
      return jok({ count: count ?? 0, sample: sample ?? [] });
    }

    if (action === "create") {
      const payload = body.campaign || {};
      if (!payload.name || !payload.message_template) return jerr("Nom et message requis");
      payload.created_by = userId;
      if (payload.status === "active") {
        payload.next_run_at = computeNextRun(payload.schedule || {});
      }
      const { data, error } = await admin.from("waouh_radar_campaigns").insert(payload).select().single();
      if (error) throw error;
      return jok({ campaign: data });
    }

    if (action === "update") {
      const { id, patch } = body;
      if (!id || !patch) return jerr("id et patch requis");
      if (patch.status === "active" && !patch.next_run_at) {
        patch.next_run_at = computeNextRun(patch.schedule || (await admin.from("waouh_radar_campaigns").select("schedule").eq("id", id).maybeSingle()).data?.schedule || {});
      }
      const { data, error } = await admin.from("waouh_radar_campaigns").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return jok({ campaign: data });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return jerr("id requis");
      const { error } = await admin.from("waouh_radar_campaigns").delete().eq("id", id);
      if (error) throw error;
      return jok({});
    }

    if (action === "pause" || action === "resume") {
      const { id } = body;
      const newStatus = action === "pause" ? "paused" : "active";
      const patch: any = { status: newStatus };
      if (newStatus === "active") {
        const { data: cur } = await admin.from("waouh_radar_campaigns").select("schedule").eq("id", id).maybeSingle();
        patch.next_run_at = computeNextRun(cur?.schedule || {});
      }
      const { data, error } = await admin.from("waouh_radar_campaigns").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return jok({ campaign: data });
    }

    if (action === "runs") {
      const { id } = body;
      const { data, error } = await admin.from("waouh_radar_campaign_runs")
        .select("*").eq("campaign_id", id).order("started_at", { ascending: false }).limit(50);
      if (error) throw error;
      return jok({ runs: data });
    }

    if (action === "run_now") {
      const { id } = body;
      await admin.from("waouh_radar_campaigns").update({ next_run_at: new Date().toISOString(), status: "active" }).eq("id", id);
      // Fire tick
      fetch(`${SUPABASE_URL}/functions/v1/waouh-radar-campaign-tick`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: id }),
      }).catch(() => {});
      return jok({ triggered: true });
    }

    if (action === "normalize_diagnostic") {
      const { count: invalidCount } = await admin.from("waouh_radar_contacts")
        .select("id", { count: "exact", head: true }).is("phone_e164_normalized", null);
      const { data: dups } = await admin.rpc("merge_radar_contacts_duplicates" as any).then((r: any) => ({ data: r?.data })).catch(() => ({ data: [] }));
      return jok({ invalid: invalidCount ?? 0, merged: dups || [] });
    }

    return jerr("Action inconnue");
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[waouh-radar-campaign-manager]", e);
    return jerr((e as Error).message, 500);
  }
});
