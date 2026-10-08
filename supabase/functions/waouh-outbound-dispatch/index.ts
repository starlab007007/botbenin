import { CENTRAL_WAHA_SESSION, isCentralWhatsAppPhone } from "../_shared/waouh-central-whatsapp.ts";
// WAOUH Outbound Dispatch — envoie les messages WhatsApp en attente via WAHA
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-waouh-internal",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
import { resolveRealPhoneE164, stripLegacyPaymentText, lidToPhoneInline } from "../_shared/waouh-format.ts";
import { getWaouhModuleControl } from "../_shared/waouh-admin-control.ts";
import { requireRuntimeOrAdmin } from "../_shared/waouh-runtime-auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL");
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY");
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";
const WAOUH_BUSINESS_PHONE = normalizeBeninPhone(Deno.env.get("WAOUH_BUSINESS_PHONE") || "65653468") || "22965653468";

const MAX_ATTEMPTS_DEFAULT = 5;
// WAHA is an external dependency. A single dead endpoint must not consume the
// whole Supabase Edge execution window through sequential route fallbacks.
const WAHA_REQUEST_TIMEOUT_MS = 3_000;

async function wahaFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = WAHA_REQUEST_TIMEOUT_MS,
) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function checkWahaProvider(
  base: string,
  session: string,
  headers: Record<string, string>,
): Promise<{ ok: boolean; reason?: string; state?: string }> {
  const normalized = base.replace(/\/$/, "");
  let lastError = "";

  for (const endpoint of [
    `/api/sessions/${encodeURIComponent(session)}`,
    "/api/sessions",
  ]) {
    try {
      const response = await wahaFetch(`${normalized}${endpoint}`, { headers });
      if (!response.ok) {
        lastError = `waha_health_http_${response.status}`;
        await response.text().catch(() => "");
        continue;
      }

      const payload = await response.json().catch(() => null);
      const candidates = Array.isArray(payload) ? payload : [payload];
      const current = candidates.find((row: any) => {
        const name = String(row?.name || row?.session || row?.session_name || "").trim();
        return !name || name === session;
      });

      if (!current) return { ok: false, reason: "waha_session_not_found" };

      const state = String(
        current?.status || current?.state || current?.engine?.state || "",
      ).trim().toUpperCase();

      if (["FAILED", "STOPPED", "DISCONNECTED", "SCAN_QR_CODE", "STARTING"].includes(state)) {
        return { ok: false, reason: `waha_session_${state.toLowerCase()}`, state };
      }

      if (session === CENTRAL_WAHA_SESSION && (state !== "WORKING" || !isCentralWhatsAppPhone(current?.me?.id))) {
        return { ok: false, reason: "central_whatsapp_identity_or_state_invalid", state };
      }
      return { ok: true, state: state || undefined };
    } catch (error: any) {
      lastError = String(error?.message || error || "waha_health_unreachable");
    }
  }

  return { ok: false, reason: lastError || "waha_health_unreachable" };
}


type WebhookRepairSummary = {
  scanned: number;
  repaired: number;
  failed: number;
  last_error?: "session_unreadable" | "remote_update_failed" | "db_sync_failed";
  last_remote_status?: number;
  last_remote_method?: "PUT" | "POST";
  last_remote_message?: string;
  attempts?: Array<{
    api: "v1" | "v2";
    method: "PUT" | "POST";
    status: number;
    message?: string;
  }>;
};

function safeWahaErrorText(value: string): string {
  return String(value || "")
    .replace(/([?&]token=)[^&\s"'<>]+/gi, "$1***")
    .replace(/(authorization|x-api-key)\s*[:=]\s*[^,}\s]+/gi, "$1=***")
    .slice(0, 320);
}

function canonicalWahaWebhookUrl(currentUrl: string): string {
  let token = "";
  try {
    token = new URL(currentUrl).searchParams.get("token") || "";
  } catch {
    token = "";
  }
  const base = `${SUPABASE_URL}/functions/v1/waha-webhook`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

function objectMap(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function wahaRepairHeaderVariants(
  baseHeaders: Record<string, string>,
): Record<string, string>[] {
  const rawApiKey =
    Deno.env.get("WAHA_API_KEY_PLAIN")?.trim() ||
    Deno.env.get("WAHA_API_KEY")?.trim() ||
    "";
  const apiKey =
    rawApiKey && !rawApiKey.startsWith("sha512:")
      ? rawApiKey
      : "";
  const dashboardUser =
    Deno.env.get("WAHA_DASHBOARD_USERNAME")?.trim() || "";
  const dashboardPassword =
    Deno.env.get("WAHA_DASHBOARD_PASSWORD")?.trim() || "";
  const basic = dashboardUser && dashboardPassword
    ? `Basic ${btoa(`${dashboardUser}:${dashboardPassword}`)}`
    : "";

  const variants: Record<string, string>[] = [];
  if (apiKey) variants.push({ ...baseHeaders, "X-Api-Key": apiKey });
  if (basic) variants.push({ ...baseHeaders, Authorization: basic });
  if (apiKey && basic) {
    variants.push({
      ...baseHeaders,
      "X-Api-Key": apiKey,
      Authorization: basic,
    });
  }

  // Preserve the worker's existing header as a final compatibility variant,
  // but never send a known sha512 digest as an API key.
  const existingKey = String(baseHeaders["X-Api-Key"] || "");
  if (existingKey && !existingKey.startsWith("sha512:")) {
    variants.push(baseHeaders);
  }

  const seen = new Set<string>();
  return variants.filter((variant) => {
    const key = JSON.stringify(
      Object.entries(variant).sort(([a], [b]) => a.localeCompare(b)),
    );
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


async function repairLegacyWahaWebhooks(
  sb: any,
  base: string | null | undefined,
  headers: Record<string, string>,
): Promise<WebhookRepairSummary> {
  const summary: WebhookRepairSummary = { scanned: 0, repaired: 0, failed: 0 };
  if (!base) return summary;

  const { data, error } = await sb
    .from("whatsapp_accounts")
    .select("id,session_name,webhook_url")
    .like("webhook_url", "%/functions/v1/waha-studio-webhook%")
    .limit(5);

  if (error) {
    console.warn("[waouh-outbound-dispatch] legacy webhook lookup failed", {
      code: error.code || null,
    });
    return summary;
  }

  const normalizedBase = base.replace(/\/$/, "");
  const authVariants = wahaRepairHeaderVariants(headers);
  if (!authVariants.length) {
    return { ...summary, failed: (data || []).length, last_error: "session_unreadable" };
  }

  for (const row of data || []) {
    summary.scanned++;
    const sessionName = String(row?.session_name || "").trim();
    const currentUrl = String(row?.webhook_url || "").trim();
    if (!sessionName || !currentUrl.includes("/functions/v1/waha-studio-webhook")) {
      continue;
    }

    const canonicalUrl = canonicalWahaWebhookUrl(currentUrl);
    let currentPayload: Record<string, any> | null = null;
    let preferredAuthHeaders: Record<string, string> | null = null;

    for (const endpoint of [
      `/api/sessions/${encodeURIComponent(sessionName)}`,
      `/api/v2/sessions/${encodeURIComponent(sessionName)}`,
    ]) {
      for (const authHeaders of authVariants) {
        try {
          const response = await wahaFetch(`${normalizedBase}${endpoint}`, {
            headers: authHeaders,
          });
          if (!response.ok) {
            await response.text().catch(() => "");
            continue;
          }
          currentPayload = objectMap(await response.json().catch(() => null));
          preferredAuthHeaders = authHeaders;
          break;
        } catch {
          // Try the next credential/API shape.
        }
      }
      if (currentPayload) break;
    }

    if (!currentPayload) {
      summary.failed++;
      summary.last_error = "session_unreadable";
      console.warn("[waouh-outbound-dispatch] legacy webhook repair: session unreadable", {
        session: sessionName,
      });
      continue;
    }

    const config = objectMap(currentPayload.config);
    const existingWebhooks = Array.isArray(config.webhooks)
      ? config.webhooks.filter((item: unknown) => {
          const url = String(objectMap(item).url || "");
          return !url.includes("/functions/v1/waha-studio-webhook") &&
            !url.includes("/functions/v1/waha-webhook");
        })
      : [];

    const nextConfig = {
      ...config,
      webhooks: [
        ...existingWebhooks,
        {
          url: canonicalUrl,
          events: [
            "message",
            "message.any",
            "message.ack",
            "message.reaction",
            "session.status",
          ],
        },
      ],
    };

    let repairedRemote = false;
    const preferredKey = preferredAuthHeaders
      ? JSON.stringify(Object.entries(preferredAuthHeaders).sort(([a], [b]) => a.localeCompare(b)))
      : "";
    const updateAuthVariants = preferredAuthHeaders
      ? [
          preferredAuthHeaders,
          ...authVariants.filter((variant) =>
            JSON.stringify(Object.entries(variant).sort(([a], [b]) => a.localeCompare(b))) !== preferredKey
          ),
        ]
      : authVariants;
    const updateEndpoints: Array<{ api: "v1" | "v2"; path: string }> = [
      { api: "v1", path: `/api/sessions/${encodeURIComponent(sessionName)}` },
      { api: "v1", path: `/api/sessions/${encodeURIComponent(sessionName)}/` },
      { api: "v2", path: `/api/v2/sessions/${encodeURIComponent(sessionName)}` },
      { api: "v2", path: `/api/v2/sessions/${encodeURIComponent(sessionName)}/` },
    ];
    summary.attempts = [];

    for (const endpoint of updateEndpoints) {
      for (const method of ["PUT", "POST"] as const) {
        for (const authHeaders of updateAuthVariants) {
          try {
            const response = await wahaFetch(
              `${normalizedBase}${endpoint.path}`,
              {
                method,
                headers: authHeaders,
                body: JSON.stringify({ name: sessionName, config: nextConfig }),
              },
              method === "PUT" && endpoint.api === "v1" ? 25_000 : 6_000,
            );
            if (!response.ok) {
              const rawError = await response.text().catch(() => "");
              summary.last_remote_status = response.status;
              summary.last_remote_method = method;
              summary.last_remote_message = safeWahaErrorText(rawError);
              summary.attempts?.push({
                api: endpoint.api,
                method,
                status: response.status,
                ...(rawError ? { message: safeWahaErrorText(rawError) } : {}),
              });
              continue;
            }
            repairedRemote = true;
            break;
          } catch (error: any) {
            summary.attempts?.push({
              api: endpoint.api,
              method,
              status: 0,
              message: String(error?.name || error?.message || "request_failed").slice(0, 120),
            });
            // A v1 PUT may restart a WORKING session and legitimately outlive
            // the request window. Avoid issuing a second concurrent config
            // mutation; the next repair pass will verify/retry idempotently.
            if (endpoint.api === "v1" && method === "PUT") break;
          }
        }
        if (repairedRemote) break;
      }
      if (repairedRemote) break;
    }

    if (!repairedRemote) {
      summary.failed++;
      summary.last_error = "remote_update_failed";
      console.warn("[waouh-outbound-dispatch] legacy webhook repair: WAHA update failed", {
        session: sessionName,
      });
      continue;
    }

    const { error: updateError } = await sb
      .from("whatsapp_accounts")
      .update({
        webhook_url: canonicalUrl,
        last_activity: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("webhook_url", currentUrl);

    if (updateError) {
      summary.failed++;
      summary.last_error = "db_sync_failed";
      console.warn("[waouh-outbound-dispatch] legacy webhook repair: DB sync failed", {
        session: sessionName,
        code: updateError.code || null,
      });
      continue;
    }

    summary.repaired++;
    console.log("[waouh-outbound-dispatch] legacy WAHA webhook repaired", {
      session: sessionName,
    });
  }

  return summary;
}

function fmt(n: number | null | undefined) {
  if (n == null) return "prix à discuter";
  return Number(n).toLocaleString("fr-FR") + " FCFA";
}

function compose(template: string, p: any): string {
  if (p?.text) return String(p.text);
  switch (template) {
    case "match_buyer":
      return `🎯 *WAOUH a trouvé pour vous*\n━━━━━━━━━━━━━━━\n📦 *${p.title || "une annonce"}*\n💰 Prix : *${fmt(p.price)}*\n📍 Ville : ${p.city || "?"}\n${p.seller_rating ? `⭐ Vendeur : ${p.seller_rating}\n` : ""}━━━━━━━━━━━━━━━\n👉 Touchez un bouton ci-dessous, ou tapez *intéressé 1* / proposez un prix.`;
    case "match_seller":
      return `📩 *WAOUH — Acheteur intéressé*\n━━━━━━━━━━━━━━━\nUn acheteur cherche : *${p.category || "votre produit"}*${p.city ? `\n📍 ${p.city}` : ""}${p.budget ? `\n💰 Budget : ${fmt(p.budget)}` : ""}\n━━━━━━━━━━━━━━━\nRépondez via les boutons, ou *OUI* / *NON*.`;
    case "negotiation_open":
      return `🤝 *Nouvelle offre WAOUH*\n━━━━━━━━━━━━━━━\n📦 *${p.title || "votre annonce"}*\n💸 Offre : *${fmt(p.price)}*\n━━━━━━━━━━━━━━━\nAcceptez, refusez ou contre-proposez ci-dessous.`;
    case "payment_card":
    case "payment_link":
      return `💳 *Paiement sécurisé WAOUH*\n━━━━━━━━━━━━━━━\n📦 ${p.title || "Transaction"}\n💰 Montant : *${fmt(p.amount)}*\n🔒 Escrow — fonds libérés à réception\n📱 Mobile Money MTN / Moov\n━━━━━━━━━━━━━━━\n🔗 ${p.url}\n\nTouchez *Payer maintenant* pour valider.`;
    case "order_recap":
      return `📋 *Récapitulatif commande*\n━━━━━━━━━━━━━━━\n📦 ${p.title || "—"}\n💰 ${fmt(p.amount)}\n📍 Livraison : ${p.delivery || "à convenir"}\n👤 Vendeur : ${p.seller_name || "—"}\n━━━━━━━━━━━━━━━`;
    default:
      return p.text || "Message WAOUH";
  }
}

function normalizeBeninPhone(value: string) {
  const original = String(value || "");
  if (original.includes("@lid")) return original.replace(/[^0-9@.a-z]/gi, "");
  // 🔒 Stubs E2E (lettres) ne doivent jamais finir en envoi WhatsApp.
  if (/[A-Za-z]/.test(original)) return null;
  const digits = original.replace(/\D/g, "");
  if (!digits) return null;
  // 🚧 Garde-fou : refuse les numéros impossiblement longs (typiquement un LID camouflé).
  if (digits.length > 15) return null;
  let candidate: string | null = null;
  if (digits.startsWith("00229")) candidate = digits.slice(2);
  else if (digits.startsWith("229")) candidate = digits;
  else if (digits.length === 8) candidate = `229${digits}`;
  else if (digits.length === 10 && digits.startsWith("01")) candidate = `229${digits}`;
  else candidate = digits.length > 8 && digits.length <= 15 ? digits : null;
  if (!candidate) return null;
  // Validation finale pour les numéros Bénin canoniques.
  if (candidate.startsWith("229") && !/^229(\d{8}|01\d{8})$/.test(candidate)) return null;
  return candidate;
}


/**
 * Pour un numéro Bénin, génère les deux candidats JID possibles :
 *  - format 10 chiffres (réforme 2021)        ex: 2290191299191
 *  - format 8 chiffres historique (sans 01)   ex: 22991299191
 * WhatsApp accepte généralement l'un des deux selon comment la ligne a été enregistrée.
 * On essaie les deux séquentiellement dans le dispatcher pour fiabiliser la livraison.
 */
function beninPhoneCandidates(canonical: string): string[] {
  if (!canonical) return [];
  if (canonical.includes("@")) return [canonical];
  const out: string[] = [canonical];
  if (canonical.startsWith("229")) {
    const local = canonical.slice(3);
    if (local.length === 10 && local.startsWith("01")) {
      const eight = `229${local.slice(2)}`;
      if (!out.includes(eight)) out.push(eight);
    } else if (local.length === 8) {
      const ten = `22901${local}`;
      if (!out.includes(ten)) out.push(ten);
    }
  }
  return out;
}

async function sendWahaText(base: string, session: string, chatId: string, text: string, headers: Record<string, string>) {
  const payload = JSON.stringify({ session, chatId, text });
  let r = await wahaFetch(`${base}/api/sendText`, { method: "POST", headers, body: payload });
  if (r.ok) return r;
  r = await wahaFetch(`${base}/api/${session}/sendText`, { method: "POST", headers, body: JSON.stringify({ chatId, text }) });
  return r;
}

async function sendWahaImage(base: string, session: string, chatId: string, imageUrl: string, caption: string, headers: Record<string, string>) {
  let r = await wahaFetch(`${base}/api/sendImage`, {
    method: "POST",
    headers,
    body: JSON.stringify({ session, chatId, file: { url: imageUrl }, caption }),
  });
  if (r.ok) return r;

  // Certaines installations WAHA n'exposent pas sendImage sur ce chemin.
  // On tente la route session, puis on dégrade TOUJOURS vers le texte :
  // une photo indisponible ne doit jamais faire perdre une notification métier.
  r = await wahaFetch(`${base}/api/${session}/sendImage`, {
    method: "POST",
    headers,
    body: JSON.stringify({ chatId, file: { url: imageUrl }, caption }),
  });
  if (r.ok) return r;

  console.warn("[waouh-outbound-dispatch] image delivery unavailable; falling back to text", {
    chatId,
    status: r.status,
  });
  return sendWahaText(base, session, chatId, caption, headers);
}

async function sendWahaButtons(base: string, session: string, chatId: string, text: string, actions: Array<{ id: string; label: string; url?: string; phone?: string }>, headers: Record<string, string>, footer?: string, title?: string, imageUrl?: string | null) {
  const richButtons = actions.slice(0, 3).map((a) => {
    if (a.url) return { type: "url", url: a.url, text: a.label };
    if (a.phone) return { type: "call", phoneNumber: a.phone, text: a.label };
    return { type: "reply", reply: { id: a.id, title: a.label } };
  });
  const richBody: any = { session, chatId, body: text, footer: footer || "WAOUH • bot.bj", buttons: richButtons };
  if (title) richBody.header = title;
  if (imageUrl) richBody.header = { image: { url: imageUrl } };
  let r = await wahaFetch(`${base}/api/sendButtons`, { method: "POST", headers, body: JSON.stringify(richBody) });
  if (r.ok) return r;
  r = await wahaFetch(`${base}/api/${session}/sendButtons`, { method: "POST", headers, body: JSON.stringify({ ...richBody, session: undefined }) });
  if (r.ok) return r;
  // Legacy simple format (boutons WAHA encore acceptés). Si échec, on tombe en
  // texte simple SANS jamais ré-injecter de liste numérotée « 1./2./3. ».
  const buttons = actions.slice(0, 3).map((a) => ({ id: a.id, text: a.label }));
  r = await wahaFetch(`${base}/api/sendButtons`, { method: "POST", headers, body: JSON.stringify({ session, chatId, text, buttons }) });
  if (r.ok) return r;
  if (imageUrl) return sendWahaImage(base, session, chatId, imageUrl, text, headers);
  return sendWahaText(base, session, chatId, text, headers);
}


function defaultActionsForTemplate(template: string, p: any): Array<{ id: string; label: string; url?: string; phone?: string }> {
  const negId = String(p?.negotiation_id || p?.neg_id || "").trim();
  const dealId = String(p?.deal_id || "").trim();
  const role = String(p?.target_role || p?.role || "").trim().toLowerCase();

  if ((template === "negotiation_open" || p?.intent === "negotiation_open") && negId) {
    return [
      { id: `accepter:${negId}`, label: "✅ Accepter" },
      { id: `contre-proposition:${negId}`, label: "💬 Contre-proposer" },
      { id: `refuser:${negId}`, label: "❌ Refuser" },
    ];
  }
  if ((template === "deal_accepted" || p?.intent === "deal_accepted") && dealId) {
    if (role === "seller") {
      return [
        { id: `confirmer-disponibilite:${dealId}`, label: "✅ Article disponible" },
        { id: `annuler:${dealId}`, label: "❌ Indisponible" },
      ];
    }
    return [
      { id: `payer-mobile:${dealId}`, label: "📱 Mobile Money" },
      { id: `paiement-livraison:${dealId}`, label: "💵 Cash livraison" },
      { id: `annuler:${dealId}`, label: "❌ Annuler" },
    ];
  }
  if (p?.workflow_state === "delivered" && dealId && role === "buyer") {
    const method = String(p?.payment_method || "").toLowerCase();
    return [{
      id: method === "mobile_money"
        ? `confirmer-paiement-mobile:${dealId}`
        : `confirmer-paiement-cash:${dealId}`,
      label: method === "mobile_money" ? "✅ Confirmer Mobile Money" : "✅ Confirmer paiement",
    }];
  }
  return [];
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const runtimeGuard = await requireRuntimeOrAdmin(req, sb);
  if (!runtimeGuard.ok) return runtimeGuard.response;

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const requestedLimit = Number(body?.limit ?? 20);
    const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 20, 20));
    const repairWebhooksOnly = body?.repair_webhooks_only === true;
    const manual = body?.manual === true || repairWebhooksOnly;
    const runStartedAt = Date.now();
    const maxRunMs = 45_000;

    const outboundControl = await getWaouhModuleControl(sb, "outbound");
    if (!outboundControl.enabled) {
      return new Response(JSON.stringify({
        ok: false,
        skipped: true,
        reason: "outbound_paused",
        message: outboundControl.maintenance_message || "Les sorties WAOUH sont temporairement suspendues.",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!outboundControl.automation_enabled) {
      if (!manual) {
        return new Response(JSON.stringify({
          ok: true,
          skipped: true,
          reason: "outbound_automation_paused",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (runtimeGuard.actor !== "admin" && runtimeGuard.actor !== "service") {
        return new Response(JSON.stringify({ ok: false, error: "admin_required_for_manual_dispatch" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const wahaHeaders = {
      "Content-Type": "application/json",
      ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}),
    };

    const runWebhookRepair = () => repairLegacyWahaWebhooks(
      sb,
      WAHA_BASE_URL,
      wahaHeaders,
    ).catch((error) => {
      console.warn("[waouh-outbound-dispatch] webhook self-heal failed", {
        message: String(error?.message || error || "unknown_error"),
      });
      return { scanned: 0, repaired: 0, failed: 1 } as WebhookRepairSummary;
    });

    if (repairWebhooksOnly) {
      const webhookRepair = await runWebhookRepair();
      return new Response(JSON.stringify({
        ok: webhookRepair.failed === 0,
        webhook_repair: webhookRepair,
      }), {
        status: webhookRepair.failed === 0 ? 200 : 207,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookRepairTask = runWebhookRepair();
    try {
      (globalThis as any).EdgeRuntime?.waitUntil?.(webhookRepairTask);
    } catch {
      webhookRepairTask.catch(() => undefined);
    }

    const nowIso = new Date().toISOString();

    // Lease recovery: a worker may crash after claiming pending→sending.
    // Requeue stale claims so one transient crash never blocks a notification forever.
    const leaseCutoff = new Date(Date.now() - 10 * 60_000).toISOString();
    const leaseHistoryCutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    try {
      // Recent worker crash: safe to retry.
      await sb.from("waouh_outbound_queue").update({
        status: "pending",
        next_attempt_at: nowIso,
        last_error: "lease_timeout_recovered",
      })
        .eq("status", "sending")
        .lt("updated_at", leaseCutoff)
        .gte("updated_at", leaseHistoryCutoff);

      // Historical stuck rows must never be replayed to customers.
      await sb.from("waouh_outbound_queue").update({
        status: "failed",
        next_attempt_at: null,
        last_error: "lease_expired_no_replay",
      })
        .eq("status", "sending")
        .lt("updated_at", leaseHistoryCutoff);
    } catch (e) {
      console.warn("[waouh-outbound-dispatch] lease recovery failed", e);
    }

    const { data: items, error } = await sb
      .from("waouh_outbound_queue")
      .select("*")
      .eq("status", "pending")
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
      .or(`circuit_open_until.is.null,circuit_open_until.lte.${nowIso}`)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;

    const pendingItems = items || [];
    const wahaNeeded = pendingItems.some((it: any) =>
      it?.channel !== "web" && !!it?.to_phone
    );
    const wahaHealth = !wahaNeeded
      ? { ok: true as const }
      : !WAHA_BASE_URL
        ? { ok: false as const, reason: "waha_base_url_missing" }
        : await checkWahaProvider(WAHA_BASE_URL, WAHA_SESSION, wahaHeaders);

    if (!wahaHealth.ok) {
      console.warn("[waouh-outbound-dispatch] WAHA unavailable; WhatsApp rows stay pending", wahaHealth);
    }

    const wahaHealthBySession = new Map<string, { ok: boolean; reason?: string; state?: string }>();
    wahaHealthBySession.set(WAHA_SESSION, wahaHealth);
    let degraded = !wahaHealth.ok;
    let degradationReason = wahaHealth.ok ? null : (wahaHealth.reason || "waha_unavailable");

    let sent = 0, failed = 0, skipped = 0, processed = 0;

    for (const it of pendingItems) {
      const requestedWahaSession = typeof it.payload?.waha_session === "string"
        ? it.payload.waha_session.trim()
        : "";
      const deliverySession = it.template === "nexus_discovery_outreach" ? CENTRAL_WAHA_SESSION : /^[A-Za-z0-9_.-]{1,96}$/.test(requestedWahaSession)
        ? requestedWahaSession
        : WAHA_SESSION;
      const requiresWaha = it?.channel !== "web" && !!it?.to_phone;

      if (requiresWaha) {
        let deliveryHealth = wahaHealthBySession.get(deliverySession);
        if (!deliveryHealth) {
          deliveryHealth = !WAHA_BASE_URL
            ? { ok: false, reason: "waha_base_url_missing" }
            : await checkWahaProvider(WAHA_BASE_URL, deliverySession, wahaHeaders);
          wahaHealthBySession.set(deliverySession, deliveryHealth);
        }
        if (!deliveryHealth.ok) {
          degraded = true;
          degradationReason = deliveryHealth.reason || "waha_unavailable";
          console.warn("[waouh-outbound-dispatch] WAHA delivery session unavailable", {
            deliverySession,
            health: deliveryHealth,
          });
          skipped++;
          continue;
        }
      }
      // Keep a hard runtime budget below the Edge idle/runtime ceiling.
      // Remaining rows stay pending and will be picked up by the next tick.
      if (Date.now() - runStartedAt >= maxRunMs) {
        console.warn("[waouh-outbound-dispatch] runtime budget reached", { processed, queued: items?.length || 0 });
        break;
      }
      processed++;
      const maxAttempts = Number(it.max_attempts) || MAX_ATTEMPTS_DEFAULT;
      if (Number(it.attempts) >= maxAttempts) {
        await sb.from("waouh_outbound_queue").update({ status: "failed", last_error: "max_attempts reached" }).eq("id", it.id);
        failed++; continue;
      }
      // 🔒 Verrouillage atomique : pending→sending.
      const { data: claimed } = await sb
        .from("waouh_outbound_queue")
        .update({ status: "sending", attempts: it.attempts + 1 })
        .eq("id", it.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!claimed) { skipped++; continue; }

      // ⏱️ Rate-limit 10 msg / min / numéro (best-effort, ignore erreurs)
      if (it.to_phone) {
        try {
          const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
          const { data: rl } = await sb.from("waouh_rate_limit")
            .select("count").eq("phone", it.to_phone).eq("window_started_at", windowStart).maybeSingle();
          if (rl && rl.count >= 10) {
            await sb.from("waouh_outbound_queue").update({
              status: "pending",
              next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
              last_error: "rate_limited",
            }).eq("id", it.id);
            skipped++; continue;
          }
          await sb.from("waouh_rate_limit").upsert({
            phone: it.to_phone, window_started_at: windowStart, count: (rl?.count ?? 0) + 1,
          }, { onConflict: "phone,window_started_at" });
        } catch (_) { /* best-effort */ }
      }

      const finishFailed = async (err: string, retry = false) => {
        const newAttempts = it.attempts + 1;
        const shouldRetry = retry && newAttempts < maxAttempts;
        // Backoff exponentiel : 5s, 30s, 2min, 10min, 1h (cap 3600s)
        const backoffSec = Math.min(5 * Math.pow(6, newAttempts - 1), 3600);
        await sb.from("waouh_outbound_queue").update({
          status: shouldRetry ? "pending" : "failed",
          last_error: err.slice(0, 500),
          next_attempt_at: shouldRetry ? new Date(Date.now() + backoffSec * 1000).toISOString() : null,
        }).eq("id", it.id);
        const contactId = typeof it.payload?.contact_id === "string" ? it.payload.contact_id : null;
        if (contactId && !shouldRetry) {
          try {
            const { data: contact } = await sb.from("waouh_entity_contacts")
              .select("failure_count").eq("id", contactId).maybeSingle();
            await sb.from("waouh_entity_contacts").update({
              failure_count: Number(contact?.failure_count || 0) + 1,
              last_failure_at: new Date().toISOString(),
              verification_status: "unreachable",
              is_whatsapp_reachable: false,
              updated_at: new Date().toISOString(),
            }).eq("id", contactId);
          } catch (_) { /* métrique best-effort */ }
        }
        failed++;
      };


      // A queued message is not an irrevocable permission: recheck immediately before dispatch.
      if (it.template === "nexus_discovery_outreach") {
        let blocked: string | null = null;
        if (it.payload?.contact_id) {
          const { data: contact, error } = await sb.from("waouh_entity_contacts").select("consent_state").eq("id", it.payload.contact_id).maybeSingle();
          if (error || !contact || contact.consent_state === "revoked") blocked = "contact_permission_unavailable";
        }
        if (it.payload?.mandate_id && !it.payload?.request_id) {
          const { data: mandate, error } = await sb.from("waouh_avatar_mandates").select("status,expires_at,metadata").eq("id", it.payload.mandate_id).maybeSingle();
          if (error || !mandate || mandate.status !== "active" || Date.parse(mandate.expires_at) <= Date.now() || mandate.metadata?.agreement_reached_at) blocked = "mandate_inactive";
        }
        if (it.payload?.journey_id) {
          const { data: journey, error } = await sb.from("waouh_opportunity_journeys").select("stage,metadata").eq("id", it.payload.journey_id).maybeSingle();
          const confirmedCompletion = journey?.stage === "completed" && it.payload?.completion_notice &&
            it.payload.completion_notice === journey.metadata?.external_agreement_id;
          if (error || !journey || (!confirmedCompletion && (it.payload?.request_id ? ["cancelled","completed"] : ["cancelled", "completed", "agreed", "executing"]).includes(journey.stage))) blocked = "journey_inactive";
        }
        if (blocked) {
          await sb.from("waouh_outbound_queue").update({ status: "failed", last_error: blocked, next_attempt_at: null }).eq("id", it.id).eq("status", "sending");
          skipped++; continue;
        }
      }

      // Web-only : pas de téléphone → realtime web suffit
      if ((it.channel && it.channel === "web") || !it.to_phone) {
        await sb.from("waouh_outbound_queue").update({
          status: it.web_session_id ? "sent" : "failed",
          last_error: it.web_session_id ? null : "no phone",
          sent_at: new Date().toISOString(),
        }).eq("id", it.id);
        skipped++; continue;
      }
      if (!WAHA_BASE_URL) {
        await finishFailed("WAHA_BASE_URL missing", true);
        continue;
      }

      const rawText = compose(it.template, it.payload || {});
      const text = stripLegacyPaymentText(rawText);
      let toPhone = it.to_phone as string;

      // 🛟 Détection LID camouflé (229 suivi de >10 chiffres) — escalade en résolution LID
      // au lieu d'envoyer à un numéro fictif que WAHA refusera ("no WA contact").
      if (typeof toPhone === "string" && /^229\d{11,}$/.test(toPhone.replace(/\D/g, ""))) {
        const stripped = toPhone.replace(/\D/g, "").slice(3); // retire le faux "229"
        toPhone = `${stripped}@lid`;
        // Aligne aussi waouh_users pour les prochaines fois.
        if (it.to_user_id) {
          try {
            await sb.from("waouh_users").update({ phone_number: toPhone }).eq("id", it.to_user_id);
          } catch (_) { /* ignore */ }
        }
      }

      // Dernier verrou central : avant tout envoi, re-résoudre le numéro réel
      // depuis l'utilisateur + l'annonce pour éviter @lid/profil obsolète.
      if (it.to_user_id) {
        try {
          const { data: targetUser } = await sb
            .from("waouh_users")
            .select("id, phone_number, auth_user_id")
            .eq("id", it.to_user_id)
            .maybeSingle();
          const role = it.payload?.target_role === "seller" || it.payload?.target_role === "buyer"
            ? it.payload.target_role
            : (it.template === "match_seller" || it.event_type === "seller_new_interest" ? "seller" : "buyer");
          const resolved = await resolveRealPhoneE164(sb, targetUser, { article_id: it.payload?.article_id ?? null, role });
          if (resolved) toPhone = resolved;
        } catch (_) { /* garde le to_phone déjà en file */ }

      }

      // 🔁 LID anonyme → résolution via waouh_lid_phone_map (cache) puis
      // fallback live WAHA /api/contacts/all avant tout envoi.
      if (typeof toPhone === "string" && /@lid/i.test(toPhone)) {
        let resolved: string | null = null;
        try {
          resolved = await lidToPhoneInline(sb, toPhone, { session: deliverySession, wahaBase: WAHA_BASE_URL, wahaApiKey: WAHA_API_KEY });
        } catch (_) { /* ignore */ }
        if (resolved && resolved.length >= 10) {
          toPhone = resolved;
          // Backfill silencieux du waouh_user pour les prochains messages.
          if (it.to_user_id) {
            try {
              await sb.from("waouh_users")
                .update({ phone_number: resolved })
                .eq("id", it.to_user_id)
                .like("phone_number", "%@lid");
            } catch (_) { /* ignore */ }
          }
        } else {
          // 🔓 Pas de mapping E.164 — mais WAHA accepte parfaitement un chatId
          // au format `<lid>@lid` pour les conversations déjà ouvertes (cf.
          // waouh-channel-in qui répond ainsi avec status 201). On garde donc
          // le LID tel quel comme chatId et on continue l'envoi.
          // toPhone reste `<digits>@lid` → traité comme candidate brute plus bas.
        }
      }


      const phone = normalizeBeninPhone(toPhone);
      if (!phone || (phone.includes("@") && !phone.includes("@lid"))) {
        await sb.from("waouh_outbound_queue").update({ status: "failed", last_error: "invalid phone" }).eq("id", it.id);
        failed++; continue;
      }
      if (isCentralWhatsAppPhone(phone)) {
        await sb.from("waouh_outbound_queue").update({ status: "failed", last_error: "central_sender_is_not_external_contact" }).eq("id", it.id);
        failed++; skipped++; continue;
      }
      const candidates = phone.includes("@lid") ? [phone] : beninPhoneCandidates(phone);
      const wahaBase = WAHA_BASE_URL!.replace(/\/$/, "");
      const customActions = Array.isArray(it.payload?.actions) ? it.payload.actions : [];
      const actions = customActions.length > 0 ? customActions : defaultActionsForTemplate(it.template, it.payload || {});
      const footer = it.payload?.footer || "WAOUH • Marché conversationnel";

      // 🔎 Pré-vol checkExists : on demande à WAHA quel JID correspond réellement
      // à chacun de nos candidats Bénin (8 vs 10 chiffres). Évite les faux 200
      // quand WAHA accepte un sendText vers un numéro non enregistré sur WhatsApp.
      const resolvedChatIds: string[] = [];
      const seenChat = new Set<string>();
      for (const candidate of candidates) {
        if (candidate.includes("@")) {
          if (!seenChat.has(candidate)) { seenChat.add(candidate); resolvedChatIds.push(candidate); }
          continue;
        }
        let mappedChatId: string | null = null;
        for (const path of [`/api/${deliverySession}/contacts/check-exists?phone=${encodeURIComponent(candidate)}`, `/api/contacts/check-exists?phone=${encodeURIComponent(candidate)}&session=${encodeURIComponent(deliverySession)}`]) {
          try {
            const cr = await wahaFetch(`${wahaBase}${path}`, { headers: wahaHeaders });
            if (!cr.ok) { await cr.text().catch(() => ""); continue; }
            const cj = await cr.json().catch(() => null);
            if (cj && (cj.numberExists === true || cj.exists === true) && typeof cj.chatId === "string") {
              mappedChatId = cj.chatId; break;
            }
            if (cj && cj.numberExists === false) { mappedChatId = ""; break; } // explicitly not on WA
          } catch (_e) { /* ignore */ }
        }
        if (mappedChatId === "") continue; // skip candidates confirmed absent
        const chatId = mappedChatId || (candidate.includes("@") ? candidate : `${candidate}@c.us`);
        if (!seenChat.has(chatId)) { seenChat.add(chatId); resolvedChatIds.push(chatId); }
      }
      if (resolvedChatIds.length === 0) {
        // Definitive WAHA preflight failure: persist it through finishFailed so
        // Opportunity OS learns that this contact is not WhatsApp-reachable and
        // can select another consented/public channel on the next cycle.
        await finishFailed(`no WA contact for ${phone}`, false);
        continue;
      }

      let lastErr = "";
      let lastTransient = false;
      let delivered = false;
      let providerMessageId: string | null = null;
      let usedChatId: string | null = null;
      try {
        for (const chatId of resolvedChatIds) {
          let r: Response;
          if (actions.length > 0) {
            r = await sendWahaButtons(wahaBase, deliverySession, chatId, text, actions, wahaHeaders, footer, undefined, it.image_url || null);
          } else if (it.image_url) {
            r = await sendWahaImage(wahaBase, deliverySession, chatId, it.image_url, text, wahaHeaders);
          } else {
            r = await sendWahaText(wahaBase, deliverySession, chatId, text, wahaHeaders);
          }
          if (r.ok) { const receipt = await r.json().catch(()=>null); providerMessageId = typeof receipt?.id === "string" ? receipt.id : receipt?.id?._serialized || null; delivered = true; usedChatId = chatId; break; }
          const body = await r.text();
          lastErr = `WAHA ${r.status} [${chatId}]: ${body.slice(0, 200)}`;
          lastTransient = r.status === 422 || r.status === 429 || r.status >= 500;
          if (lastTransient) break;
        }
        if (!delivered) {
          await finishFailed(lastErr || "WAHA send failed", lastTransient);
          continue;
        }
        const sentAt = new Date().toISOString();
        await sb.from("waouh_outbound_queue").update({
          status: "sent", sent_at: sentAt, payload: { ...it.payload, provider_message_id: providerMessageId }, last_error: usedChatId ? `delivered via ${usedChatId}` : null,
        }).eq("id", it.id);
        const contactId = typeof it.payload?.contact_id === "string" ? it.payload.contact_id : null;
        if (contactId) {
          try {
            const { data: contact } = await sb.from("waouh_entity_contacts")
              .select("sent_count").eq("id", contactId).maybeSingle();
            await sb.from("waouh_entity_contacts").update({
              sent_count: Number(contact?.sent_count || 0) + 1,
              last_success_at: sentAt,
              verification_status: "reachable",
              is_whatsapp_reachable: true,
              updated_at: sentAt,
            }).eq("id", contactId);
          } catch (_) { /* métrique best-effort */ }
        }
        sent++;
      } catch (e: any) {
        // Erreur réseau → retry
        await finishFailed(String(e.message || e), true);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      degraded,
      degradation_reason: degradationReason,
      processed,
      queued: pendingItems.length,
      sent,
      failed,
      skipped,
      budget_ms: maxRunMs,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-outbound-dispatch]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
