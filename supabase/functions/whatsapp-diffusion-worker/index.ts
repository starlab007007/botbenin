import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH = 10;
const ACTIVE_STATUSES = new Set(["WORKING", "connected"]);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pickVariant(variants: { body: string; media_url: string | null }[]) {
  if (!variants.length) return { body: "", media_url: null };
  return variants[Math.floor(Math.random() * variants.length)];
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function buildWahaHeaderVariants(extra: Record<string, string> = {}) {
  const variants: Record<string, string>[] = [];
  const plain = Deno.env.get("WAHA_API_KEY_PLAIN")?.trim();
  const rawKey = Deno.env.get("WAHA_API_KEY")?.trim();
  const key = plain || (rawKey && !rawKey.startsWith("sha512:") ? rawKey : "");

  if (key) {
    variants.push(
      { "Content-Type": "application/json", "X-Api-Key": key, ...extra },
      { "Content-Type": "application/json", "X-API-Key": key, ...extra },
      { "Content-Type": "application/json", "x-api-key": key, ...extra },
      { "Content-Type": "application/json", Authorization: `ApiKey ${key}`, ...extra },
      { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...extra },
    );
  }

  const user = Deno.env.get("WAHA_DASHBOARD_USERNAME");
  const pass = Deno.env.get("WAHA_DASHBOARD_PASSWORD");
  if (user && pass) {
    variants.push({ "Content-Type": "application/json", Authorization: `Basic ${btoa(`${user}:${pass}`)}`, ...extra });
  }

  if (variants.length === 0) variants.push({ "Content-Type": "application/json", ...extra });
  return variants;
}

async function wahaFetch(base: string, endpoint: string, init: RequestInit = {}) {
  let last: Response | null = null;
  for (const headers of buildWahaHeaderVariants(init.headers as Record<string, string> | undefined)) {
    try {
      const res = await fetch(`${base}${endpoint}`, { ...init, headers });
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403)) return res;
      last = res;
    } catch (e) {
      if (!last) throw e;
    }
  }
  return last;
}

async function loadAllJobsForStats(admin: any, campaignId: string) {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("wa_send_jobs")
      .select("status, sent_at, delivered_at, read_at, replied_at")
      .eq("campaign_id", campaignId)
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function updateCampaignStats(admin: any, campaignId: string) {
  const rows = await loadAllJobsForStats(admin, campaignId);
  const stats: Record<string, number> = {
    total: rows.length,
    queued: 0,
    sending: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    replied: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
  };

  for (const row of rows) {
    if (row.status === "queued") stats.queued++;
    if (row.status === "sending") stats.sending++;
    if (row.status === "failed") stats.failed++;
    if (row.status === "skipped") stats.skipped++;
    if (row.sent_at || ["sent", "delivered", "read", "replied"].includes(row.status)) stats.sent++;
    if (row.delivered_at || ["delivered", "read", "replied"].includes(row.status)) stats.delivered++;
    if (row.read_at || ["read", "replied"].includes(row.status)) stats.read++;
    if (row.replied_at || row.status === "replied") stats.replied++;
  }
  stats.pending = stats.queued + stats.sending;

  const nextStatus = stats.pending > 0
    ? "running"
    : stats.failed > 0 && stats.sent === 0 && stats.skipped === 0
      ? "failed"
      : "done";

  await admin.from("wa_campaigns").update({ stats, status: nextStatus }).eq("id", campaignId);
  return stats;
}

async function logEvent(admin: any, campaign: any, level: "info" | "warning" | "error", message: string, payload: Record<string, unknown> = {}) {
  await admin.from("wa_campaign_events").insert({
    campaign_id: campaign.id,
    user_id: campaign.user_id,
    level,
    message,
    payload,
  });
}

async function failJobs(admin: any, campaign: any, jobs: any[], message: string, payload: Record<string, unknown> = {}) {
  const ids = jobs.map((j) => j.id);
  if (ids.length) {
    await admin.from("wa_send_jobs").update({ status: "failed", last_error: message }).in("id", ids);
  }
  await logEvent(admin, campaign, "error", message, { jobs: ids.length, ...payload });
}

async function getLiveSessionStatus(base: string, sessionName: string) {
  const res = await wahaFetch(base, `/api/sessions/${encodeURIComponent(sessionName)}`, { method: "GET" });
  if (!res) throw new Error("WAHA ne répond pas");
  const text = await res.text();
  if (res.status === 401 || res.status === 403) throw new Error("WAHA refuse l’accès: clé API ou identifiants invalides");
  if (res.status === 404) return "NOT_FOUND";
  if (!res.ok) throw new Error(`WAHA session status ${res.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text || "{}");
  return data?.status ?? data?.data?.status ?? data?.state ?? "UNKNOWN";
}

function messageIdFromWaha(parsed: any) {
  if (!parsed) return null;
  if (typeof parsed.id === "string") return parsed.id;
  return parsed?.id?._serialized ?? parsed?._data?.id?._serialized ?? parsed?.key?.id ?? parsed?.messageId ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json().catch(() => ({}));
    const targetCampaignId = typeof body.campaignId === "string" ? body.campaignId : null;
    const nowIso = new Date().toISOString();
    const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    await admin
      .from("wa_send_jobs")
      .update({ status: "queued", last_error: "Repris après interruption du worker" })
      .eq("status", "sending")
      .lt("updated_at", staleIso);

    let query = admin
      .from("wa_send_jobs")
      .select("id, campaign_id, user_id, contact_id, to_phone, attempt")
      .eq("status", "queued")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(BATCH);

    if (targetCampaignId) query = query.eq("campaign_id", targetCampaignId);

    const { data: jobs, error: jobsError } = await query;
    if (jobsError) throw jobsError;

    if (!jobs || jobs.length === 0) {
      if (targetCampaignId) await updateCampaignStats(admin, targetCampaignId);
      return json({ ok: true, processed: 0, sent: 0, failed: 0, message: "Aucun envoi prêt" });
    }

    const ids = jobs.map((j: any) => j.id);
    await admin.from("wa_send_jobs").update({ status: "sending", last_error: null }).in("id", ids);

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const byCampaign = new Map<string, any[]>();
    for (const j of jobs) {
      if (!byCampaign.has(j.campaign_id)) byCampaign.set(j.campaign_id, []);
      byCampaign.get(j.campaign_id)!.push(j);
    }

    const wahaBaseUrl = (Deno.env.get("WAHA_BASE_URL") || "").replace(/\/+$/, "").replace(/\/dashboard$/, "");

    for (const [campaignId, list] of byCampaign) {
      const { data: campaign } = await admin.from("wa_campaigns").select("*").eq("id", campaignId).single();
      if (!campaign) {
        await admin.from("wa_send_jobs").update({ status: "failed", last_error: "Campagne introuvable" }).in("id", list.map((j: any) => j.id));
        failed += list.length;
        continue;
      }

      try {
        if (campaign.status === "paused") {
          await admin.from("wa_send_jobs").update({ status: "skipped", last_error: "campaign paused" }).in("id", list.map((j: any) => j.id));
          skipped += list.length;
          await updateCampaignStats(admin, campaignId);
          continue;
        }

        if (!wahaBaseUrl) {
          await failJobs(admin, campaign, list, "WAHA_BASE_URL n’est pas configuré");
          failed += list.length;
          await updateCampaignStats(admin, campaignId);
          continue;
        }

        const { data: variantsRaw } = await admin.from("wa_campaign_messages").select("body, media_url").eq("campaign_id", campaignId);
        const variants = variantsRaw && variantsRaw.length > 0 ? variantsRaw : [{ body: campaign.body, media_url: campaign.media_url }];

        const { data: session } = await admin
          .from("whatsapp_accounts")
          .select("id, session_name, status, phone_number")
          .eq("id", campaign.session_id)
          .single();

        if (!session) {
          await failJobs(admin, campaign, list, "Session WhatsApp introuvable. Choisissez une session valide pour la campagne.");
          failed += list.length;
          await updateCampaignStats(admin, campaignId);
          continue;
        }

        let liveStatus = session.status;
        try {
          liveStatus = await getLiveSessionStatus(wahaBaseUrl, session.session_name);
          if (liveStatus && liveStatus !== session.status) {
            await admin.from("whatsapp_accounts").update({ status: liveStatus, last_activity: new Date().toISOString() }).eq("id", session.id);
          }
        } catch (e: any) {
          await failJobs(admin, campaign, list, e?.message ?? "Impossible de vérifier l’état de la session WAHA");
          failed += list.length;
          await updateCampaignStats(admin, campaignId);
          continue;
        }

        // S'assurer que la session WAHA envoie bien les events ack (livré/lu)
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const hookUrl = `${supabaseUrl}/functions/v1/waha-webhook`;
          await wahaFetch(wahaBaseUrl, `/api/sessions/${encodeURIComponent(session.session_name)}`, {
            method: "PUT",
            body: JSON.stringify({
              config: {
                webhooks: [
                  { url: hookUrl, events: ["message", "message.any", "message.ack", "message.reaction", "session.status"] },
                ],
              },
            }),
          }).catch(() => null);
        } catch (_) { /* non bloquant */ }

        if (!ACTIVE_STATUSES.has(liveStatus)) {
          await failJobs(
            admin,
            campaign,
            list,
            `Session WAHA déconnectée (${liveStatus}). Rescannez le QR dans Sessions puis relancez les échecs.`,
            { session: session.session_name, liveStatus },
          );
          failed += list.length;
          await updateCampaignStats(admin, campaignId);
          continue;
        }

        for (const job of list) {
          try {
            const { data: alreadyReplied } = await admin
              .from("wa_send_jobs")
              .select("id")
              .eq("campaign_id", campaignId)
              .eq("contact_id", job.contact_id)
              .eq("status", "replied")
              .limit(1);
            if (alreadyReplied && alreadyReplied.length > 0) {
              await admin.from("wa_send_jobs").update({ status: "skipped", last_error: "already replied" }).eq("id", job.id);
              skipped++;
              continue;
            }

            const { data: contact } = await admin.from("wa_contacts").select("display_name, tags, opt_out, archived").eq("id", job.contact_id).single();
            if (!contact || contact.opt_out || contact.archived) {
              await admin.from("wa_send_jobs").update({ status: "skipped", last_error: "Contact opt-out, archivé ou introuvable" }).eq("id", job.id);
              skipped++;
              continue;
            }

            const variant = pickVariant(variants as any);
            const vars = {
              nom: contact.display_name ?? "",
              prenom: (contact.display_name ?? "").split(" ")[0] ?? "",
              tag: (contact.tags ?? []).join(", "),
            };
            const rendered = renderTemplate(variant.body, vars);
            const mediaUrl = variant.media_url ?? campaign.media_url;
            const baseDigits = job.to_phone.replace(/[^\d]/g, "");
            // Bénin (229) : générer variantes — format WhatsApp correct est SANS le "01" → prioritaire.
            const phoneVariants: string[] = [];
            if (baseDigits.startsWith("229")) {
              const local = baseDigits.slice(3);
              if (local.startsWith("01") && local.length === 10) {
                phoneVariants.push("229" + local.slice(2)); // sans 01 (PRIORITAIRE)
                phoneVariants.push(baseDigits);              // avec 01 (fallback)
              } else if (local.length === 8) {
                phoneVariants.push(baseDigits);              // sans 01 (PRIORITAIRE)
                phoneVariants.push("22901" + local);         // avec 01 (fallback)
              } else {
                phoneVariants.push(baseDigits);
              }
            } else {
              phoneVariants.push(baseDigits);
            }

            // Pré-vérifie l'existence WhatsApp pour choisir le bon chatId (évite les "sent" silencieux)
            let chosenChatId: string | null = null;
            let usedPhone = phoneVariants[0];
            for (const v of phoneVariants) {
              try {
                const chk = await wahaFetch(
                  wahaBaseUrl,
                  `/api/contacts/check-exists?phone=${encodeURIComponent(v)}&session=${encodeURIComponent(session.session_name)}`,
                  { method: "GET" },
                );
                if (chk && chk.ok) {
                  const cd = await chk.json().catch(() => ({} as any));
                  if (cd?.numberExists === true) {
                    chosenChatId = cd?.chatId ?? `${v}@c.us`;
                    usedPhone = v;
                    break;
                  }
                }
              } catch { /* tente la suivante */ }
            }
            if (!chosenChatId) {
              throw new Error(`Numéro non inscrit sur WhatsApp (essayé: ${phoneVariants.join(", ")})`);
            }

            let endpoint = "/api/sendText";
            const basePayload: any = { session: session.session_name };
            // Fallback automatique : si type média mais URL manquante et qu'on a un body → envoi texte
            let effectiveType = campaign.type;
            if (["photo", "video", "audio", "file"].includes(effectiveType) && !mediaUrl) {
              if (rendered && rendered.trim().length > 0) {
                await logEvent(admin, campaign, "warning", `Média ${effectiveType} manquant → fallback texte`, { jobId: job.id });
                effectiveType = "text";
              } else {
                throw new Error(`Média ${effectiveType} manquant et aucun texte de secours`);
              }
            }
            // Lien : on envoie en texte en ajoutant l'URL pour générer un aperçu WhatsApp
            if (effectiveType === "link") {
              effectiveType = "text";
              if (mediaUrl) {
                rendered = `${rendered ? rendered.trim() + "\n\n" : ""}${mediaUrl}`;
              }
            }
            switch (effectiveType) {
              case "photo":
                endpoint = "/api/sendImage";
                basePayload.file = { url: mediaUrl };
                basePayload.caption = rendered;
                break;
              case "video":
                endpoint = "/api/sendVideo";
                basePayload.file = { url: mediaUrl };
                basePayload.caption = rendered;
                break;
              case "audio":
                endpoint = "/api/sendVoice";
                basePayload.file = { url: mediaUrl };
                break;
              case "file":
                endpoint = "/api/sendFile";
                basePayload.file = { url: mediaUrl };
                basePayload.caption = rendered;
                break;
              default:
                basePayload.text = rendered;
                basePayload.linkPreview = true;
            }

            const payload = { ...basePayload, chatId: chosenChatId };
            const res = await wahaFetch(wahaBaseUrl, endpoint, { method: "POST", body: JSON.stringify(payload) });
            if (!res) throw new Error("WAHA ne répond pas pendant l'envoi");
            const text = await res.text();
            let parsed: any = null;
            try { parsed = JSON.parse(text || "{}"); } catch { parsed = null; }
            if (!res.ok) throw new Error(`WAHA ${res.status}: ${text.slice(0, 300)}`);

            await admin.from("wa_send_jobs").update({
              status: "sent",
              sent_at: new Date().toISOString(),
              waha_message_id: messageIdFromWaha(parsed),
              rendered_body: rendered,
              to_phone: usedPhone.startsWith("+") ? usedPhone : `+${usedPhone}`,
              last_error: null,
            }).eq("id", job.id);
            sent++;
          } catch (e: any) {
            await admin.from("wa_send_jobs").update({
              status: "failed",
              last_error: (e?.message ?? "Erreur d’envoi").slice(0, 300),
              attempt: (job.attempt ?? 0) + 1,
            }).eq("id", job.id);
            failed++;
          }
        }

        await updateCampaignStats(admin, campaignId);
        await logEvent(admin, campaign, "info", `Worker terminé: ${sent} envoyé(s), ${failed} échec(s), ${skipped} ignoré(s)`, { batch: list.length });
      } catch (e: any) {
        await failJobs(admin, campaign, list, (e?.message ?? "Erreur worker").slice(0, 300));
        failed += list.length;
        await updateCampaignStats(admin, campaignId);
      }
    }

    return json({ ok: true, processed: jobs.length, sent, failed, skipped });
  } catch (e: any) {
    console.error("whatsapp-diffusion-worker failed", e);
    return json({ ok: false, processed: 0, sent: 0, failed: 0, error: e?.message ?? "Erreur inconnue worker", fallback: true });
  }
});
