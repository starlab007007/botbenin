// Cron tick — picks active campaigns whose next_run_at <= now() and enqueues sends.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function computeNextRun(schedule: any, from: Date = new Date()): string | null {
  const type = schedule?.type || "one_shot";
  if (type === "one_shot") return null;
  const hour = parseInt(schedule?.hour ?? "10", 10);
  const minute = parseInt(schedule?.minute ?? "0", 10);
  const days: number[] = Array.isArray(schedule?.days_of_week) ? schedule.days_of_week.map((d: any) => parseInt(d, 10)) : [];
  const next = new Date(from);
  next.setUTCSeconds(0, 0);
  next.setUTCHours(hour, minute, 0, 0);
  if (type === "daily") {
    if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString();
  }
  if (type === "weekly") {
    if (!days.length) days.push(1);
    for (let i = 1; i < 9; i++) {
      const c = new Date(next);
      c.setUTCDate(next.getUTCDate() + i);
      if (days.includes(c.getUTCDay())) return c.toISOString();
    }
  }
  return null;
}

function renderTemplate(tpl: string, vars: Record<string, any>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
}

function isAudienceSegment(segment: any): boolean {
  // New Diffusion IA wizard shape: uses secteurs/classes/villes/sources/min_*
  return !!(segment && (
    (Array.isArray(segment.secteurs) && segment.secteurs.length) ||
    (Array.isArray(segment.classes) && segment.classes.length) ||
    (Array.isArray(segment.villes) && segment.villes.length) ||
    (Array.isArray(segment.sources) && segment.sources.length) ||
    typeof segment.min_qualite === "number" ||
    typeof segment.min_intent === "number" ||
    typeof segment.min_freshness_days === "number"
  ));
}

async function resolveAudienceContacts(admin: any, segment: any) {
  // Diffusion IA — resolve via v_diffusion_audience (catalog + radar + wa_contacts unified)
  let q = admin.from("v_diffusion_audience")
    .select("phone_e164, display_name, secteur, ville, classe, sources, last_seen_at")
    .eq("is_whatsapp", true)
    .eq("opt_out", false)
    .not("phone_e164", "is", null);
  if (Array.isArray(segment?.secteurs) && segment.secteurs.length) q = q.in("secteur", segment.secteurs);
  if (Array.isArray(segment?.villes) && segment.villes.length) q = q.in("ville", segment.villes);
  if (Array.isArray(segment?.classes) && segment.classes.length) q = q.in("classe", segment.classes);
  if (typeof segment?.min_intent === "number") q = q.gte("intent_score", segment.min_intent);
  if (typeof segment?.min_qualite === "number") q = q.gte("qualite_score", segment.min_qualite);
  if (typeof segment?.min_freshness_days === "number") q = q.lte("freshness_days", segment.min_freshness_days);
  if (Array.isArray(segment?.sources) && segment.sources.length) q = q.overlaps("sources", segment.sources);
  const { data, error } = await q.limit(5000);
  if (error) throw error;
  // Normalize phone E.164 (BJ: prefix 229 if missing) + dedup
  const seen = new Set<string>();
  const out: any[] = [];
  for (const r of data || []) {
    let raw = String(r.phone_e164 || "").replace(/[^\d+]/g, "");
    if (raw.startsWith("+")) raw = raw.slice(1);
    if (!raw) continue;
    if (raw.length === 10 && raw.startsWith("0")) raw = "229" + raw.slice(1);
    else if (raw.length === 8) raw = "229" + raw;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push({
      id: raw, // synthetic id for audience-mode (no radar_contacts row)
      phone_e164_normalized: raw,
      display_name: r.display_name,
      categories: r.secteur ? [r.secteur] : [],
      cities: r.ville ? [r.ville] : [],
      _audience_mode: true,
    });
  }
  return out;
}

async function resolveSegment(admin: any, segment: any) {
  if (isAudienceSegment(segment)) {
    return { audienceMode: true, rows: await resolveAudienceContacts(admin, segment) };
  }
  let q = admin.from("waouh_radar_contacts").select("id, phone_e164_normalized, display_name, categories, cities");
  q = q.in("status", ["new", "opted_in"]);
  q = q.not("phone_e164_normalized", "is", null);
  if (Array.isArray(segment?.categories) && segment.categories.length) q = q.overlaps("categories", segment.categories);
  if (Array.isArray(segment?.cities) && segment.cities.length) q = q.overlaps("cities", segment.cities);
  if (segment?.min_signals && segment.min_signals > 0) q = q.gte("signal_count", segment.min_signals);
  if (segment?.last_seen_within_days > 0) q = q.gte("last_seen_at", new Date(Date.now() - segment.last_seen_within_days * 86400000).toISOString());
  if (segment?.intent === "BUY") q = q.gt("intent_buy_count", 0);
  if (segment?.intent === "SELL") q = q.gt("intent_sell_count", 0);
  const { data, error } = await q;
  if (error) throw error;
  return { audienceMode: false, rows: data || [] };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const body = await req.json().catch(() => ({}));
  const onlyCampaign: string | undefined = body?.campaign_id;

  let q = admin.from("waouh_radar_campaigns")
    .select("*").eq("status", "active").lte("next_run_at", new Date().toISOString());
  if (onlyCampaign) q = admin.from("waouh_radar_campaigns").select("*").eq("id", onlyCampaign);

  const { data: campaigns, error } = await q;
  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: corsHeaders });

  const results: any[] = [];
  for (const c of campaigns || []) {
    // Gate on admin approval
    if (c.requires_approval && (!c.quota_approved || c.quota_approved <= (c.quota_consumed ?? 0))) {
      results.push({ campaign_id: c.id, skipped_reason: "awaiting_approval_or_quota_exhausted" });
      continue;
    }
    const remainingQuota = c.quota_approved ? Math.max(0, c.quota_approved - (c.quota_consumed ?? 0)) : Infinity;
    // Create run
    const { data: run } = await admin.from("waouh_radar_campaign_runs").insert({ campaign_id: c.id }).select().single();
    const runId = run?.id;

    let contacts: any[] = [];
    let audienceMode = false;
    try {
      const seg = await resolveSegment(admin, c.segment || {});
      audienceMode = seg.audienceMode;
      contacts = seg.rows;
    } catch (e: any) {
      console.error("[tick] segment error", c.id, e?.message);
    }
    let targeted = contacts.length;
    let sent = 0, skipped = 0;
    const errs: any[] = [];

    // Per-contact weekly cap (this campaign)
    for (const ct of contacts) {
      try {
        const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const sendsQ = admin.from("waouh_radar_campaign_sends")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", c.id).gte("created_at", oneWeekAgo);
        const { count: weekCntCampaign } = await (audienceMode
          ? sendsQ.eq("audience_phone_e164", ct.phone_e164_normalized)
          : sendsQ.eq("contact_id", ct.id));
        if ((weekCntCampaign ?? 0) >= (c.max_per_contact_per_week ?? 1)) { skipped++; continue; }
        if (sent >= remainingQuota) { skipped++; continue; }
        // Global cap: 3 / contact / 7d toutes campagnes
        const globalQ = admin.from("waouh_radar_campaign_sends")
          .select("id", { count: "exact", head: true })
          .gte("created_at", oneWeekAgo);
        const { count: weekCntGlobal } = await (audienceMode
          ? globalQ.eq("audience_phone_e164", ct.phone_e164_normalized)
          : globalQ.eq("contact_id", ct.id));
        if ((weekCntGlobal ?? 0) >= 3) { skipped++; continue; }

        const vars = {
          display_name: ct.display_name || "",
          ville: (ct.cities || [])[0] || "",
          categorie_top: (ct.categories || [])[0] || "",
        };
        const message = renderTemplate(c.message_template || "", vars);
        const dedup = `radar_campaign:${c.id}:${ct.phone_e164_normalized}:${Date.now()}`;
        const { error: enqErr } = await admin.rpc("waouh_enqueue_outbound_v2" as any, {
          p_to_phone: ct.phone_e164_normalized,
          p_to_user_id: null,
          p_template: "radar_broadcast",
          p_payload: { text: message, article_id: c.article_id, media_url: c.media_url, contact_id: audienceMode ? null : ct.id, campaign_id: c.id, mode: c.mode, audience_mode: audienceMode },
          p_image_url: c.media_url ?? null,
          p_channel: "whatsapp",
          p_transaction_id: null,
          p_dedupe_key: dedup,
          p_event_type: `radar_campaign_${c.mode}`,
        });
        if (enqErr) { errs.push({ contact: ct.phone_e164_normalized, error: enqErr.message }); skipped++; continue; }

        await admin.from("waouh_radar_campaign_sends").insert({
          campaign_id: c.id, run_id: runId,
          contact_id: audienceMode ? null : ct.id,
          audience_phone_e164: audienceMode ? ct.phone_e164_normalized : null,
          phone_e164: ct.phone_e164_normalized, status: "sent", sent_at: new Date().toISOString(),
        });
        if (!audienceMode) {
          await admin.from("waouh_radar_contacts").update({ last_message_at: new Date().toISOString() }).eq("id", ct.id);
        }
        sent++;
      } catch (e: any) {
        errs.push({ contact: ct.phone_e164_normalized, error: e.message });
        skipped++;
      }
    }


    const nextRunAt = computeNextRun(c.schedule || {});
    const newConsumed = (c.quota_consumed ?? 0) + sent;
    const quotaExhausted = c.quota_approved && newConsumed >= c.quota_approved;
    await admin.from("waouh_radar_campaigns").update({
      last_run_at: new Date().toISOString(),
      next_run_at: quotaExhausted ? null : nextRunAt,
      quota_consumed: newConsumed,
      status: quotaExhausted ? "done" : (nextRunAt ? "active" : "done"),
    }).eq("id", c.id);

    await admin.from("waouh_radar_campaign_runs").update({
      finished_at: new Date().toISOString(),
      contacts_targeted: targeted, contacts_sent: sent, contacts_skipped: skipped,
      errors: errs,
    }).eq("id", runId);

    results.push({ campaign_id: c.id, targeted, sent, skipped });
  }

  // Trigger dispatch
  fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 100 }),
  }).catch(() => {});

  return new Response(JSON.stringify({ ok: true, processed: results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
