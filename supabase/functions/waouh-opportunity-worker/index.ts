// deno-lint-ignore-file no-explicit-any
// WAOUH Opportunity OS worker — bounded autonomous discovery/contact.
// Service/tick only. Executes only within an explicit active Avatar mandate.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
import { isServiceCaller, isTickCaller } from "../_shared/waouh-internal-auth.ts";
import { decryptPhone, sha256Hex } from "../_shared/waouh-tel/crypto.ts";
import { normalizeE164 } from "../_shared/waouh-tel/phone.ts";
import { scoreFabricSignal, contactabilityPolicy, type FabricSignal } from "../_shared/waouh-signal-fabric.ts";
import {
  buildContactPack,
  mandateAllowsContact,
  type ChannelCandidate,
} from "../_shared/waouh-opportunity-os.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function resolvePack(sb: SupabaseClient, signal: any) {
  const fabricId = String(signal.fabric_id ?? "");
  const sourceKey = String(signal.source_key ?? "unknown");
  const internal =
    (fabricId.startsWith("article:") || fabricId.startsWith("buyer:") || fabricId.startsWith("catalog:")) &&
    ["waouh_app","whatsapp","partner"].includes(sourceKey);
  const channels: ChannelCandidate[] = [];
  let entityId: string | null = null;
  let externalSignal: any = null;
  let contacts: any[] = [];
  if (internal) {
    channels.push({
      channel: "waouh",
      verified: true,
      reachable: true,
      public_business: sourceKey === "partner",
      consent_state: sourceKey === "partner" ? "partner_contract" : "initiated",
    });
  }
  if (fabricId.startsWith("external:")) {
    const id = fabricId.slice("external:".length);
    const { data } = await sb.from("waouh_external_commerce_signals")
      .select("id,entity_id,submitted_by,contactability_level,source_key,source_url,actor_name,product_name")
      .eq("id", id).maybeSingle();
    externalSignal = data;
    entityId = data?.entity_id ?? null;
    if (entityId) {
      const { data: rows } = await sb.from("waouh_entity_contacts")
        .select("id,channel,value_encrypted,value_last4,public_value,contactability_level,consent_state,is_public_business,verified_at,verification_status,last_success_at,last_failure_at,sent_count,reply_count,failure_count,is_whatsapp_reachable")
        .eq("entity_id", entityId)
        .order("contactability_level", { ascending: false }).limit(20);
      contacts = rows ?? [];
      for (const row of contacts) {
        channels.push({
          channel: String(row.channel || "other"),
          last4: row.value_last4 ?? null,
          verified: !!row.verified_at || ["verified","reachable"].includes(String(row.verification_status || "")),
          reachable: row.is_whatsapp_reachable ?? (row.verification_status === "reachable" ? true : null),
          public_business: row.is_public_business === true,
          consent_state: row.consent_state ?? null,
          last_success_at: row.last_success_at ?? null,
          last_failure_at: row.last_failure_at ?? null,
          reply_count: Number(row.reply_count ?? 0),
          failure_count: Number(row.failure_count ?? 0),
        });
      }
    }
  }
  const pack = buildContactPack({
    fabricId,
    sourceKey,
    contactability: signal.contactability_level,
    trustScore: signal.trust_score,
    observedAt: signal.observed_at,
    entityResolved: internal || !!entityId,
    internalArticle: internal,
    channels,
  });
  await sb.from("waouh_contact_packs").upsert({
    fabric_id: fabricId,
    entity_id: entityId,
    source_key: sourceKey,
    contactability_level: pack.contactability_level,
    readiness_level: pack.readiness_level,
    readiness_score: pack.readiness_score,
    actionability_score: pack.actionability_score,
    next_best_action: pack.next_best_action,
    best_channel: pack.best_channel,
    available_channels: pack.available_channels,
    masked_contacts: pack.masked_contacts,
    verification: { verified_channel: pack.verified_channel, computed_by: "opportunity_worker" },
    last_enriched_at: new Date().toISOString(),
    last_verified_at: pack.verified_channel ? new Date().toISOString() : null,
    metadata: { subject: signal.subject ?? null, intent: signal.intent ?? null },
  }, { onConflict: "fabric_id" });
  return { pack, externalSignal, contacts, internal };
}

async function ensureJourney(sb: SupabaseClient, ownerId: string, mandate: any, signal: any, pack: any, matchScore: number) {
  const { data: existing } = await sb.from("waouh_opportunity_journeys")
    .select("*").eq("owner_id", ownerId).eq("fabric_id", signal.fabric_id)
    .not("stage", "in", '("completed","cancelled")')
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) {
    await sb.from("waouh_opportunity_journeys").update({
      mandate_id: mandate.id,
      readiness_level: pack.readiness_level,
      readiness_score: pack.readiness_score,
      actionability_score: pack.actionability_score,
      next_best_action: pack.next_best_action,
      contact_pack: pack,
      metadata: { ...(existing.metadata || {}), match_score: matchScore, worker_seen_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    return { ...existing, mandate_id: mandate.id, contact_pack: pack };
  }
  const stage = pack.next_best_action === "CONTACT_NOW" || pack.next_best_action === "OPEN_DEAL_ROOM"
    ? "contact_ready" : "enriching";
  const { data, error } = await sb.from("waouh_opportunity_journeys").insert({
    owner_id: ownerId,
    mandate_id: mandate.id,
    fabric_id: signal.fabric_id,
    mode: mandate.mode,
    stage,
    contactability_level: signal.contactability_level ?? "C0",
    source_key: signal.source_key ?? null,
    source_url: signal.source_url ?? null,
    subject: signal.subject ?? null,
    city: signal.city ?? null,
    readiness_level: pack.readiness_level,
    readiness_score: pack.readiness_score,
    actionability_score: pack.actionability_score,
    next_best_action: pack.next_best_action,
    contact_pack: pack,
    last_action: "autonomy_match_selected",
    next_action: pack.next_best_action,
    last_message: "Avatar a sélectionné cette opportunité selon votre mandat.",
    metadata: { match_score: matchScore, autonomy_mode: mandate.autonomy_mode },
  }).select("*").single();
  if (error) throw error;
  return data;
}

async function resolveInternalRecipient(sb: SupabaseClient, signal: any) {
  const evidence = signal.evidence && typeof signal.evidence === "object" ? signal.evidence : {};
  const waouhId = signal.fabric_id?.startsWith("buyer:")
    ? evidence.user_id
    : (evidence.seller_id || evidence.user_id);
  if (!waouhId) return null;
  const { data } = await sb.from("waouh_users").select("auth_user_id,display_name").eq("id", waouhId).maybeSingle();
  return data?.auth_user_id ? data : null;
}

async function contactInternal(sb: SupabaseClient, mandate: any, signal: any, journey: any) {
  const recipient = await resolveInternalRecipient(sb, signal);
  if (!recipient?.auth_user_id || recipient.auth_user_id === mandate.owner_id) return { contacted: false, reason: "internal_recipient_missing" };
  const ref = `autonomy:waouh:${mandate.id}:${signal.fabric_id}`;
  const { data: already } = await sb.from("waouh_conversation_bus_events").select("id").eq("external_ref", ref).maybeSingle();
  if (already) return { contacted: false, reason: "already_contacted" };
  const message = mandate.mode === "sell"
    ? `WAOUH accompagne un vendeur dont l’offre correspond à votre besoin « ${signal.subject || mandate.goal} ». Souhaitez-vous poursuivre ?`
    : `WAOUH accompagne un acheteur intéressé par « ${signal.subject || mandate.goal} ». Souhaitez-vous poursuivre ?`;
  const { data: approval, error } = await sb.from("waouh_agent_approvals").insert({
    owner_id: recipient.auth_user_id,
    action_type: "send_message",
    action_summary: message,
    context: {
      operation: "opportunity_os.internal_mandate_contact",
      mandate_id: mandate.id,
      journey_id: journey.id,
      fabric_id: signal.fabric_id,
      from_auth_user: mandate.owner_id,
      message,
    },
    status: "pending",
    expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
  }).select("id").single();
  if (error) throw error;
  await sb.rpc("waouh_append_conversation_bus_event", {
    p_owner_id: mandate.owner_id,
    p_event_type: "autonomy.internal_contact_requested",
    p_channel: "waouh",
    p_direction: "out",
    p_fabric_id: signal.fabric_id,
    p_journey_id: journey.id,
    p_mandate_id: mandate.id,
    p_article_id: null,
    p_thread_id: null,
    p_negotiation_id: null,
    p_deal_id: null,
    p_external_ref: ref,
    p_payload: { approval_id: approval.id, recipient_auth_user_id: recipient.auth_user_id },
  });
  await sb.from("waouh_opportunity_journeys").update({
    stage: "waiting_reply",
    contact_channel: "waouh",
    last_action: "autonomous_contact_requested",
    next_action: "WAIT_REPLY",
    last_message: "Avatar a transmis votre intérêt dans WAOUH.",
    updated_at: new Date().toISOString(),
  }).eq("id", journey.id);
  return { contacted: true, channel: "waouh" };
}

async function contactExternal(sb: SupabaseClient, mandate: any, signal: any, journey: any, resolved: any) {
  const { pack, contacts, externalSignal } = resolved;
  if (!externalSignal?.entity_id) return { contacted: false, reason: "external_entity_missing" };
  const permission = mandateAllowsContact(mandate, pack);
  if (!permission.allowed) return { contacted: false, reason: permission.reason };
  if (!["whatsapp","phone"].includes(String(pack.best_channel || ""))) return { contacted: false, reason: "no_supported_channel" };

  const level = String(externalSignal.contactability_level || "C0");
  const target = contacts.find((row: any) => {
    if (!row.value_encrypted || !["whatsapp","phone"].includes(String(row.channel))) return false;
    if (level === "C1") {
      return mandate.allow_public_business !== false &&
        (row.is_public_business === true || row.consent_state === "public_business");
    }
    return ["C2","C3","C4","C5"].includes(String(row.contactability_level || level));
  });
  if (!target) return { contacted: false, reason: "contact_not_permitted" };
  if (level === "C1" && mandate.require_approval_for_c1 === true) return { contacted: false, reason: "c1_requires_approval" };

  const clear = await decryptPhone(target.value_encrypted);
  const e164 = normalizeE164(clear);
  if (!e164) return { contacted: false, reason: "invalid_phone" };
  const ref = `autonomy:whatsapp:${mandate.id}:${signal.fabric_id}`;
  const { data: already } = await sb.from("waouh_conversation_bus_events").select("id").eq("external_ref", ref).maybeSingle();
  if (already) return { contacted: false, reason: "already_contacted" };

  const message = mandate.mode === "sell"
    ? `Bonjour, WAOUH accompagne un vendeur dont l’offre correspond à votre besoin « ${signal.subject || mandate.goal} ». Souhaitez-vous poursuivre dans WAOUH ?`
    : `Bonjour, WAOUH accompagne un utilisateur intéressé par « ${signal.subject || mandate.goal} ». Souhaitez-vous poursuivre dans WAOUH ?`;
  const dedupe = `opportunity-os:${mandate.id}:${signal.fabric_id}:${await sha256Hex(message)}`;
  const { error } = await sb.rpc("waouh_enqueue_outbound_v2", {
    p_to_phone: e164.replace(/\D/g, ""),
    p_to_user_id: null,
    p_template: "nexus_discovery_outreach",
    p_payload: {
      text: message,
      actions: [],
      fabric_id: signal.fabric_id,
      signal_id: externalSignal.id,
      source_key: signal.source_key,
      subject: signal.subject,
      initiated_by_auth_user: mandate.owner_id,
      mandate_id: mandate.id,
      journey_id: journey.id,
      contact_id: target.id,
    },
    p_web_session_id: null,
    p_image_url: null,
    p_channel: "whatsapp",
    p_dedupe_key: dedupe,
    p_event_type: "opportunity_os_outreach",
  });
  if (error) throw error;

  await sb.rpc("waouh_append_conversation_bus_event", {
    p_owner_id: mandate.owner_id,
    p_event_type: "autonomy.external_contact_queued",
    p_channel: "whatsapp",
    p_direction: "out",
    p_fabric_id: signal.fabric_id,
    p_journey_id: journey.id,
    p_mandate_id: mandate.id,
    p_article_id: null,
    p_thread_id: null,
    p_negotiation_id: null,
    p_deal_id: null,
    p_external_ref: ref,
    p_payload: { contact_id: target.id, phone_last4: target.value_last4, source_key: signal.source_key },
  });
  await sb.from("waouh_opportunity_journeys").update({
    stage: "waiting_reply",
    contact_channel: "whatsapp",
    last_action: "autonomous_whatsapp_queued",
    next_action: "WAIT_REPLY",
    last_message: "Avatar a contacté cette opportunité selon votre mandat.",
    updated_at: new Date().toISOString(),
  }).eq("id", journey.id);
  return { contacted: true, channel: "whatsapp" };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  if (!isServiceCaller(req, SERVICE_ROLE) && !(await isTickCaller(req, sb))) {
    return json({ ok: false, code: "service_role_required" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(50, Math.max(1, Number(body?.limit) || 20));
  const now = new Date();
  await sb.from("waouh_avatar_mandates").update({ status: "expired" })
    .eq("status", "active").lt("expires_at", now.toISOString());
  await sb.from("waouh_persistent_intents").update({ status: "expired" })
    .eq("status", "active").lt("expires_at", now.toISOString());

  const { data: intents, error } = await sb.from("waouh_persistent_intents")
    .select("*,waouh_avatar_mandates(*)")
    .eq("status", "active")
    .lte("next_scan_at", now.toISOString())
    .order("next_scan_at", { ascending: true })
    .limit(limit);
  if (error) return json({ ok: false, code: "intent_load_failed", message: error.message }, 500);

  const result = { scanned_intents: 0, matches: 0, actionable: 0, contacted: 0, skipped: 0, errors: 0 };
  for (const intent of intents ?? []) {
    result.scanned_intents++;
    try {
      const mandate = intent.waouh_avatar_mandates;
      if (!mandate || mandate.status !== "active") {
        result.skipped++;
        continue;
      }
      const desired = intent.mode === "find_buyers" ? ["BUY","RFQ"] : ["SELL","ANNOUNCE"];
      const { data: signals, error: signalError } = await sb.from("waouh_signal_fabric")
        .select("*").in("intent", desired).order("observed_at", { ascending: false }).limit(1500);
      if (signalError) throw signalError;
      const ranked = (signals ?? []).map((signal: FabricSignal) => ({
        ...signal,
        scores: scoreFabricSignal({
          query: intent.query_text,
          mode: intent.mode === "find_buyers" ? "find_buyers" : "find_sellers",
          city: intent.city,
          budgetMax: intent.budget_max,
          signal,
        }),
      })).filter((row: any) => Number(row.scores.total_score || 0) >= Number(intent.min_match_score || 75))
        .sort((a: any,b: any) => Number(b.scores.total_score) - Number(a.scores.total_score))
        .slice(0, Math.max(Number(mandate.max_contacts || 3) * 4, 12));
      result.matches += ranked.length;

      let contactedThisRun = 0;
      let actionableThisRun = 0;
      for (const signal of ranked) {
        if (contactedThisRun >= Number(mandate.max_contacts || 3)) break;
        const resolved = await resolvePack(sb, signal);
        const pack = resolved.pack;
        if (Number(pack.actionability_score || 0) < Number(intent.min_actionability_score || 65)) continue;
        actionableThisRun++;
        result.actionable++;
        const journey = await ensureJourney(sb, mandate.owner_id, mandate, signal, pack, Number(signal.scores.total_score || 0));
        let contactResult: any;
        if (resolved.internal) contactResult = await contactInternal(sb, mandate, signal, journey);
        else contactResult = await contactExternal(sb, mandate, signal, journey, resolved);
        if (contactResult.contacted) {
          contactedThisRun++;
          result.contacted++;
        } else {
          result.skipped++;
        }
      }

      const nextAt = new Date(Date.now() + Number(intent.scan_interval_minutes || 60) * 60_000).toISOString();
      await sb.from("waouh_persistent_intents").update({
        last_scan_at: new Date().toISOString(),
        next_scan_at: nextAt,
        last_result_count: ranked.length,
        last_actionable_count: actionableThisRun,
      }).eq("id", intent.id);
      await sb.from("waouh_avatar_mandates").update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextAt,
        contacted_count: Number(mandate.contacted_count || 0) + contactedThisRun,
      }).eq("id", mandate.id);
    } catch (e) {
      console.error("[waouh-opportunity-worker]", e);
      result.errors++;
    }
  }

  if (result.contacted > 0) {
    fetch(`${SUPABASE_URL}/functions/v1/waouh-outbound-dispatch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: Math.min(100, result.contacted * 3) }),
    }).catch(() => {});
  }
  return json({ ok: true, ...result });
});
