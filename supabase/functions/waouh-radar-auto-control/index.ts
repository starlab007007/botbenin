// Admin endpoint — control Radar IA auto-messages (kill switch, quiet hours, caps, bulk contact ops).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function jerr(message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function jok(data: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function assertAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) throw jerr("Authentification requise", 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) throw jerr("Session invalide", 401);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isAdmin, error } = await admin.rpc("has_role", {
    _user_id: user.id,
    _role_name: "admin",
  } as any);
  if (error) throw jerr(`Vérification admin impossible: ${error.message}`, 500);
  if (!isAdmin) throw jerr("Accès admin requis", 403);
  return { admin, userId: user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { admin, userId } = await assertAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action: string = body.action || "get_settings";

    // Ensure singleton row
    await admin.from("waouh_radar_auto_settings").upsert({ id: 1 }, { onConflict: "id" });

    if (action === "get_settings") {
      const { data: settings, error } = await admin
        .from("waouh_radar_auto_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [sentTodayQ, scheduledQ, optOutQ, autoOnQ] = await Promise.all([
        admin.from("waouh_outbound_queue")
          .select("id", { count: "exact", head: true })
          .like("event_type", "radar_auto_%")
          .in("status", ["sent", "delivered"])
          .gte("created_at", since),
        admin.from("waouh_outbound_queue")
          .select("id", { count: "exact", head: true })
          .like("event_type", "radar_auto_%")
          .eq("status", "queued"),
        admin.from("waouh_radar_contacts")
          .select("id", { count: "exact", head: true })
          .in("status", ["opted_out", "blocked"]),
        admin.from("waouh_radar_contacts")
          .select("id", { count: "exact", head: true })
          .eq("auto_notify", true),
      ]);
      return jok({
        settings,
        stats: {
          sent_today: sentTodayQ.count ?? 0,
          scheduled: scheduledQ.count ?? 0,
          opted_out: optOutQ.count ?? 0,
          auto_on: autoOnQ.count ?? 0,
        },
      });
    }

    if (action === "update_settings") {
      const patch = body.patch || {};
      const allowed = [
        "auto_enabled", "auto_default_for_new_contacts",
        "quiet_hours_start", "quiet_hours_end", "timezone",
        "max_per_contact_per_day", "max_total_per_day", "pause_until",
      ];
      const clean: Record<string, unknown> = {};
      for (const k of allowed) if (k in patch) clean[k] = patch[k];
      clean.updated_by = userId;
      clean.updated_at = new Date().toISOString();
      const { data, error } = await admin
        .from("waouh_radar_auto_settings").update(clean).eq("id", 1).select().single();
      if (error) throw error;
      return jok({ settings: data });
    }

    if (action === "pause_now") {
      const minutes = Math.max(1, Number(body.minutes || 60));
      const pauseUntil = new Date(Date.now() + minutes * 60000).toISOString();
      const { data, error } = await admin
        .from("waouh_radar_auto_settings")
        .update({ pause_until: pauseUntil, updated_by: userId, updated_at: new Date().toISOString() })
        .eq("id", 1).select().single();
      if (error) throw error;
      return jok({ settings: data });
    }

    if (action === "resume_now") {
      const { data, error } = await admin
        .from("waouh_radar_auto_settings")
        .update({ pause_until: null, auto_enabled: true, updated_by: userId, updated_at: new Date().toISOString() })
        .eq("id", 1).select().single();
      if (error) throw error;
      return jok({ settings: data });
    }

    if (action === "bulk_contacts") {
      const ids: string[] = body.ids || [];
      const op: string = body.op;
      if (!ids.length) return jerr("ids requis");
      const patch: Record<string, unknown> = {};
      if (op === "enable_auto") patch.auto_notify = true;
      else if (op === "disable_auto") patch.auto_notify = false;
      else if (op === "opt_out") patch.status = "opted_out";
      else if (op === "block") patch.status = "blocked";
      else if (op === "unblock") patch.status = "new";
      else return jerr("op invalide");
      const { error } = await admin.from("waouh_radar_contacts").update(patch).in("id", ids);
      if (error) throw error;
      return jok({ updated: ids.length });
    }

    if (action === "cancel_scheduled") {
      const ids: string[] | undefined = body.contact_ids;
      let q = admin.from("waouh_outbound_queue")
        .update({ status: "cancelled", last_error: "cancelled_by_admin" })
        .like("event_type", "radar_auto_%")
        .eq("status", "queued");
      if (ids && ids.length) {
        q = q.in("payload->>contact_id", ids as any);
      }
      const { data, error } = await q.select("id");
      if (error) throw error;
      return jok({ cancelled: data?.length ?? 0 });
    }

    if (action === "list_scheduled") {
      const ids: string[] | undefined = body.contact_ids;
      let q = admin.from("waouh_outbound_queue")
        .select("id, to_phone, template, payload, next_attempt_at, created_at, status, event_type")
        .like("event_type", "radar_auto_%")
        .eq("status", "queued")
        .order("next_attempt_at", { ascending: true, nullsFirst: true })
        .limit(200);
      if (ids && ids.length) q = q.in("payload->>contact_id", ids as any);
      const { data, error } = await q;
      if (error) throw error;
      const items = (data ?? []).map((m: any) => ({ ...m, scheduled_at: m.next_attempt_at }));
      return jok({ items });
    }

    return jerr("Action inconnue");
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[waouh-radar-auto-control]", e);
    return jerr((e as Error).message, 500);
  }
});
