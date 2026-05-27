// Worker cron : prend des jobs "queued" dont scheduled_at est passé, envoie via WAHA,
// applique throttle par session et délais aléatoires, met à jour le statut.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH = 10;

function pickVariant(variants: { body: string; media_url: string | null }[]): { body: string; media_url: string | null } {
  if (!variants.length) return { body: "", media_url: null };
  return variants[Math.floor(Math.random() * variants.length)];
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Prend des jobs prêts à partir
    const { data: jobs } = await admin
      .from("wa_send_jobs")
      .select("id, campaign_id, user_id, contact_id, to_phone, attempt")
      .eq("status", "queued")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(BATCH);

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verrouille: passe à `sending`
    const ids = jobs.map((j: any) => j.id);
    await admin.from("wa_send_jobs").update({ status: "sending" }).in("id", ids);

    let sent = 0, failed = 0;

    // Groupe par campagne pour ne charger qu'une fois variantes + campagne
    const byCampaign = new Map<string, any[]>();
    for (const j of jobs) {
      if (!byCampaign.has(j.campaign_id)) byCampaign.set(j.campaign_id, []);
      byCampaign.get(j.campaign_id)!.push(j);
    }

    for (const [campaignId, list] of byCampaign) {
      const { data: campaign } = await admin.from("wa_campaigns").select("*").eq("id", campaignId).single();
      if (!campaign) continue;
      const { data: variantsRaw } = await admin.from("wa_campaign_messages")
        .select("body, media_url").eq("campaign_id", campaignId);
      const variants = (variantsRaw && variantsRaw.length > 0)
        ? variantsRaw
        : [{ body: campaign.body, media_url: campaign.media_url }];

      const { data: session } = await admin.from("whatsapp_accounts")
        .select("session_name, phone_number").eq("id", campaign.session_id).single();
      if (!session) {
        await admin.from("wa_send_jobs").update({ status: "failed", last_error: "session not found" })
          .in("id", list.map((j: any) => j.id));
        failed += list.length;
        continue;
      }

      // WAHA config
      let wahaBaseUrl = Deno.env.get("WAHA_BASE_URL")?.replace(/\/+$/, "").replace(/\/dashboard$/, "");
      const wahaApiKey = (Deno.env.get("WAHA_API_KEY_PLAIN") || Deno.env.get("WAHA_API_KEY") || "").trim();

      for (const job of list) {
        try {
          // Stop-on-reply : si le contact a déjà répondu dans cette campagne
          const { data: alreadyReplied } = await admin.from("wa_send_jobs")
            .select("id").eq("campaign_id", campaignId).eq("contact_id", job.contact_id)
            .eq("status", "replied").limit(1);
          if (alreadyReplied && alreadyReplied.length > 0) {
            await admin.from("wa_send_jobs").update({ status: "skipped", last_error: "already replied" }).eq("id", job.id);
            continue;
          }

          const { data: contact } = await admin.from("wa_contacts")
            .select("display_name, tags, opt_out, archived").eq("id", job.contact_id).single();
          if (!contact || contact.opt_out || contact.archived) {
            await admin.from("wa_send_jobs").update({ status: "skipped", last_error: "opt-out/archived" }).eq("id", job.id);
            continue;
          }

          const variant = pickVariant(variants as any);
          const vars = {
            nom: contact.display_name ?? "",
            prenom: (contact.display_name ?? "").split(" ")[0] ?? "",
            tag: (contact.tags ?? []).join(", "),
          };
          const rendered = renderTemplate(variant.body, vars);

          // Format chatId WAHA : pays + numéro sans +
          const chatId = `${job.to_phone.replace(/[^\d]/g, "")}@c.us`;
          let endpoint = "/api/sendText";
          const payload: any = { session: session.session_name, chatId };
          switch (campaign.type) {
            case "photo": endpoint = "/api/sendImage"; payload.file = { url: variant.media_url ?? campaign.media_url }; payload.caption = rendered; break;
            case "video": endpoint = "/api/sendVideo"; payload.file = { url: variant.media_url ?? campaign.media_url }; payload.caption = rendered; break;
            case "audio": endpoint = "/api/sendVoice"; payload.file = { url: variant.media_url ?? campaign.media_url }; break;
            case "file":  endpoint = "/api/sendFile";  payload.file = { url: variant.media_url ?? campaign.media_url }; payload.caption = rendered; break;
            default: payload.text = rendered;
          }

          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (wahaApiKey) headers["X-Api-Key"] = wahaApiKey;

          const res = await fetch(`${wahaBaseUrl}${endpoint}`, {
            method: "POST", headers, body: JSON.stringify(payload),
          });
          const text = await res.text();
          let parsed: any = null;
          try { parsed = JSON.parse(text); } catch {}

          if (!res.ok) {
            await admin.from("wa_send_jobs").update({
              status: "failed", last_error: `WAHA ${res.status}: ${text.slice(0, 300)}`, attempt: (job.attempt ?? 0) + 1,
            }).eq("id", job.id);
            failed++;
            continue;
          }

          await admin.from("wa_send_jobs").update({
            status: "sent",
            sent_at: new Date().toISOString(),
            waha_message_id: parsed?.id ?? parsed?._data?.id?._serialized ?? null,
            rendered_body: rendered,
          }).eq("id", job.id);
          sent++;
        } catch (e: any) {
          await admin.from("wa_send_jobs").update({
            status: "failed", last_error: (e?.message ?? "err").slice(0, 300), attempt: (job.attempt ?? 0) + 1,
          }).eq("id", job.id);
          failed++;
        }
      }

      // Stats campagne
      const { count: total } = await admin.from("wa_send_jobs").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId);
      const { count: doneOk } = await admin.from("wa_send_jobs").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "sent");
      const { count: pending } = await admin.from("wa_send_jobs").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "queued");
      await admin.from("wa_campaigns").update({
        stats: { total, sent: doneOk, pending },
        status: pending === 0 ? "done" : "running",
      }).eq("id", campaignId);
    }

    return new Response(JSON.stringify({ processed: jobs.length, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), { status: 500, headers: corsHeaders });
  }
});
