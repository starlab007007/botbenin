// Diffusion IA — Relance J+3 des contacts non-répondants
// POST { campaign_id?: string, min_age_days?: number (default 3), max?: number (default 200) }
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  ,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FOLLOWUP_TEMPLATES = [
  "Bonjour 👋 toujours intéressé par cette annonce ? On peut négocier 😉",
  "Petit rappel amical 🙏 — votre avis nous intéresse, dites-nous si ça vous parle.",
  "Dernière chance ⏳ — l'opportunité est encore disponible aujourd'hui.",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: corsHeaders });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const body = await req.json().catch(() => ({}));
  const campaignId: string | undefined = body?.campaign_id;
  const minAgeDays = Math.max(1, Math.min(30, Number(body?.min_age_days ?? 3)));
  const maxRelaunches = Math.max(1, Math.min(1000, Number(body?.max ?? 200)));
  const ageCutoff = new Date(Date.now() - minAgeDays * 86400000).toISOString();

  // Pick non-responders, max 1 relance
  let q = admin.from("waouh_radar_campaign_sends")
    .select("id, campaign_id, contact_id, audience_phone_e164, phone_e164, sent_at, relaunch_count, waouh_radar_campaigns:campaign_id(article_id, media_url, mode)")
    .is("response_at", null)
    .eq("relaunch_count", 0)
    .lte("sent_at", ageCutoff)
    .order("sent_at", { ascending: true })
    .limit(maxRelaunches);
  if (campaignId) q = q.eq("campaign_id", campaignId);


  const { data: sends, error } = await q;
  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: corsHeaders });

  let relaunched = 0, skipped = 0;
  const errs: any[] = [];
  for (const s of sends || []) {
    try {
      const text = FOLLOWUP_TEMPLATES[Math.floor(Math.random() * FOLLOWUP_TEMPLATES.length)];
      const camp: any = (s as any).waouh_radar_campaigns || {};
      const dedup = `radar_relaunch:${s.campaign_id}:${s.contact_id}:${Date.now()}`;
      const { error: enqErr } = await admin.rpc("waouh_enqueue_outbound_v2" as any, {
        p_to_phone: s.phone_e164,
        p_to_user_id: null,
        p_template: "radar_relaunch",
        p_payload: { text, article_id: camp.article_id, media_url: camp.media_url, campaign_id: s.campaign_id, contact_id: s.contact_id, relaunch: true },
        p_image_url: camp.media_url ?? null,
        p_channel: "whatsapp",
        p_transaction_id: null,
        p_dedupe_key: dedup,
        p_event_type: `radar_relaunch_${camp.mode ?? "default"}`,
      });
      if (enqErr) { errs.push({ id: s.id, error: enqErr.message }); skipped++; continue; }
      await admin.from("waouh_radar_campaign_sends").update({
        relaunch_count: (s.relaunch_count ?? 0) + 1,
        last_relaunched_at: new Date().toISOString(),
      }).eq("id", s.id);
      relaunched++;
    } catch (e: any) {
      errs.push({ id: s.id, error: e.message });
      skipped++;
    }
  }

  // Kick dispatch
  fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 100 }),
  }).catch(() => {});

  return new Response(JSON.stringify({ ok: true, candidates: sends?.length ?? 0, relaunched, skipped, errors: errs }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
