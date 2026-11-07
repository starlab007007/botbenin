// waouh-contact-enrich
// Cherche le vrai contact du vendeur d'une annonce externe : texte de l'annonce, puis page d'origine.
// Les coordonnées publiées dans l'annonce sont révélées à l'utilisateur connecté (niveau C1) pour qu'il écrive lui-même.
// Elles ne donnent AUCUN droit d'envoi automatique : is_public_business reste faux et le consentement « inconnu ».
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireRuntimeOrAdmin } from "../_shared/waouh-runtime-auth.ts";
import { extractContacts, pageNeedsRenderer } from "../_shared/waouh-contact-extract.ts";
import { decryptPhone, encryptPhone, hashPhone, sha256Hex } from "../_shared/waouh-tel/crypto.ts";
import { phoneLast4 } from "../_shared/waouh-tel/phone.ts";
import { guardedWahaFetch } from "../_shared/waouh-waha-egress.ts";
import { CENTRAL_WAHA_SESSION } from "../_shared/waouh-central-whatsapp.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
const RECHECK_MS = 7 * 86400_000;

function safePublicUrl(value: unknown): URL | null {
  try {
    const url = new URL(String(value ?? ""));
    if (!/^https?:$/.test(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || /^[\d.]+$/.test(host) || host.includes(":")) return null;
    return url;
  } catch { return null; }
}

async function plainPage(url: URL): Promise<string> {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; WAOUHBot/1.0)", Accept: "text/html,application/xhtml+xml" },
  });
  if (!response.ok) return "";
  const type = response.headers.get("content-type") || "";
  if (!/text\/html|text\/plain|xhtml/.test(type)) return "";
  return (await response.text()).slice(0, 400_000);
}

async function renderedPage(url: URL): Promise<string> {
  if (!FIRECRAWL_API_KEY) return "";
  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: url.toString(), formats: ["markdown", "links"], onlyMainContent: false }),
  });
  if (!response.ok) return "";
  const data = await response.json();
  const markdown = data.markdown ?? data.data?.markdown ?? "";
  const links = data.links ?? data.data?.links ?? [];
  return `${markdown}\n${Array.isArray(links) ? links.join("\n") : ""}`.slice(0, 400_000);
}

/** Le numéro est-il sur WhatsApp ? null si la vérification n'est pas possible maintenant. */
async function onWhatsApp(phone: string): Promise<boolean | null> {
  const base = (Deno.env.get("WAHA_BASE_URL") || "").replace(/\/+$/, "").replace(/\/dashboard$/, "");
  if (!base) return null;
  const key = Deno.env.get("WAHA_API_KEY_PLAIN")?.trim() || Deno.env.get("WAHA_API_KEY")?.trim() || "";
  try {
    const response = await guardedWahaFetch(
      `${base}/api/contacts/check-exists?session=${encodeURIComponent(CENTRAL_WAHA_SESSION)}&phone=${encodeURIComponent(phone.replace(/\D/g, ""))}`,
      { headers: key && !key.startsWith("sha512:") ? { "X-Api-Key": key } : {}, signal: AbortSignal.timeout(6000) },
    );
    if (!response.ok) return null;
    const body = await response.json();
    return Boolean(body?.numberExists ?? body?.exists ?? false);
  } catch { return null; }
}

async function saveContact(sb: any, entityId: string, sourceKey: string, channel: "whatsapp" | "phone" | "email", value: string) {
  const hash = channel === "email" ? await sha256Hex(value.toLowerCase()) : await hashPhone(value);
  const { data: existing } = await sb.from("waouh_entity_contacts").select("id,contactability_level,consent_state")
    .eq("entity_id", entityId).eq("value_hash", hash).in("channel", channel === "whatsapp" ? ["whatsapp", "phone"] : [channel]).limit(1).maybeSingle();
  if (existing?.id) return false; // ne jamais rétrograder ni écraser un contact déjà qualifié
  const { error } = await sb.from("waouh_entity_contacts").insert({
    entity_id: entityId,
    channel,
    source_key: sourceKey,
    value_encrypted: await encryptPhone(channel === "email" ? value.toLowerCase() : value),
    value_hash: hash,
    value_last4: channel === "email" ? null : phoneLast4(value),
    is_public_business: false,
    consent_state: "unknown",
    contactability_level: "C1",
    verification_status: "observed",
  });
  return !error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const guard = await requireRuntimeOrAdmin(req, sb);
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body?.limit) || 12, 1), 30);
  const stats = { checked: 0, with_contact: 0, saved: 0, pages: 0, rendered: 0, failed: 0, verified: 0 };
  let verifyBudget = 8;
  let renderBudget = 4;
  try {
    const cols = "id,entity_id,source_key,source_url,raw_text,contactability_level,evidence,status,updated_at";
    // Offres de vente, services et appels d'offres seulement : on n'expose pas le contact d'un particulier qui cherche à acheter.
    const base = () => sb.from("waouh_external_commerce_signals").select(cols)
      .eq("status", "active").not("entity_id", "is", null).in("contactability_level", ["C0", "C1"]).in("intent", ["SELL", "ANNOUNCE", "RFQ"]);
    const fresh = await base().filter("evidence->>contact_enriched_at", "is", null).order("updated_at", { ascending: false }).limit(limit);
    if (fresh.error) throw fresh.error;
    let todo: any[] = fresh.data ?? [];
    if (todo.length < limit) {
      const stale = await base().filter("evidence->>contact_enriched_at", "lt", new Date(Date.now() - RECHECK_MS).toISOString())
        .order("updated_at", { ascending: false }).limit(limit - todo.length);
      todo = todo.concat(stale.data ?? []);
    }
    const { count: pending } = await sb.from("waouh_external_commerce_signals").select("id", { count: "exact", head: true })
      .eq("status", "active").not("entity_id", "is", null).in("intent", ["SELL", "ANNOUNCE", "RFQ"]).filter("evidence->>contact_enriched_at", "is", null);

    for (const row of todo) {
      stats.checked++;
      try {
        let text = String(row.raw_text ?? "");
        const url = safePublicUrl(row.source_url);
        let found = extractContacts(text);
        if (!found.whatsapp.length && !found.phones.length && !found.emails.length && url) {
          const social = pageNeedsRenderer(url.toString());
          if (!social) { text += "\n" + await plainPage(url).catch(() => ""); stats.pages++; }
          else if (renderBudget > 0) { renderBudget--; text += "\n" + await renderedPage(url).catch(() => ""); stats.rendered++; }
          found = extractContacts(text);
        }
        let saved = 0;
        for (const p of found.whatsapp) if (await saveContact(sb, row.entity_id, row.source_key, "whatsapp", p)) saved++;
        for (const p of found.phones) if (await saveContact(sb, row.entity_id, row.source_key, "phone", p)) saved++;
        for (const e of found.emails) if (await saveContact(sb, row.entity_id, row.source_key, "email", e)) saved++;
        const any = found.whatsapp.length + found.phones.length + found.emails.length > 0;
        if (any) stats.with_contact++;
        stats.saved += saved;
        await sb.from("waouh_external_commerce_signals").update({
          ...(any && row.contactability_level === "C0" ? { contactability_level: "C1" } : {}),
          evidence: { ...(row.evidence ?? {}), contact_enriched_at: new Date().toISOString(), contact_found: any, contact_origin: any ? "listing" : null },
        }).eq("id", row.id);
      } catch (_e) {
        stats.failed++;
        await sb.from("waouh_external_commerce_signals").update({
          evidence: { ...(row.evidence ?? {}), contact_enriched_at: new Date().toISOString(), contact_found: false },
        }).eq("id", row.id);
      }
    }
    // Vérification WhatsApp des numéros trouvés (quelques-uns par passage, avec le garde-fou d'envoi WAHA).
    const { data: pending } = await sb.from("waouh_entity_contacts").select("id,value_encrypted")
      .in("channel", ["whatsapp", "phone"]).eq("contactability_level", "C1").is("is_whatsapp_reachable", null)
      .not("value_encrypted", "is", null).order("created_at", { ascending: false }).limit(verifyBudget);
    for (const contact of pending ?? []) {
      let phone = "";
      try { phone = await decryptPhone(contact.value_encrypted); } catch { continue; }
      const exists = await onWhatsApp(phone);
      stats.verified++;
      if (exists === null) break;
      await sb.from("waouh_entity_contacts").update({
        is_whatsapp_reachable: exists,
        verification_status: exists ? "reachable" : "unreachable",
        ...(exists ? { channel: "whatsapp" } : {}),
      }).eq("id", contact.id);
    }
    return new Response(JSON.stringify({ ok: true, ...stats, remaining: Math.max(0, (pending ?? 0) - todo.length) }), { headers });
  } catch (_e) {
    return new Response(JSON.stringify({ ok: false, error: "enrich_unavailable", ...stats }), { status: 500, headers });
  }
});
