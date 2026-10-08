import { claimAvatarContact } from "../_shared/waouh-avatar-contact.ts";
import { maintainAvatarQueues } from "../_shared/waouh-avatar-maintenance.ts";
import { followupDelayHours, withinMandateBudget, journeyReplyToken } from "../_shared/waouh-avatar-lifecycle.ts";
import { advanceAvatarLifecycle, finishLegacySearch, requestAvatarApproval, avatarNotice } from "../_shared/waouh-avatar-orchestrator.ts";
import { releaseHeaders } from "../_shared/waouh-release.ts";
// deno-lint-ignore-file no-explicit-any
// WAOUH Opportunity OS worker — bounded autonomous discovery/contact.
// Service/tick only. Executes only within an explicit active Avatar mandate.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
import { isServiceCaller, isTickCaller } from "../_shared/waouh-internal-auth.ts";
import { decryptPhone, encryptPhone, hashPhone, sha256Hex } from "../_shared/waouh-tel/crypto.ts";
import { normalizeE164, phoneLast4 } from "../_shared/waouh-tel/phone.ts";
import { assertResolvesPublic, isPublicHostname } from "../_shared/waouh-egress-guard.ts";
import { extractPublicContactHints, scoreFabricSignal, type FabricSignal } from "../_shared/waouh-signal-fabric.ts";
import {
  buildContactPack,
  mandateAllowsContact,
  remainingContactCapacity,
  boundedFollowUpDecision,
  type ChannelCandidate,
} from "../_shared/waouh-opportunity-os.ts";
import { routeOpportunityChannel } from "../_shared/waouh-channel-router.ts";
import { enqueueTelMessage } from "../_shared/waouh-tel/db.ts";
import { telRuntimeSecret } from "../_shared/waouh-tel/runtime-secret.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AGENTIC_FUNCTION =
  Deno.env.get("WAOUH_AGENTIC_CORE_FUNCTION") || "waouh-studio-e2e-v21465";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...releaseHeaders, "Content-Type": "application/json" } });

async function discoverPersistentIntentWithNexus(
  sb: SupabaseClient,
  intent: any,
  mandate: any,
) {
  const metadata = intent?.metadata && typeof intent.metadata === "object"
    ? intent.metadata as Record<string, unknown>
    : {};
  const lastExternalRaw = typeof metadata.last_external_refresh_at === "string"
    ? Date.parse(metadata.last_external_refresh_at)
    : NaN;
  const refreshExternal = mandate.metadata?.external_refresh_enabled !== false && (!Number.isFinite(lastExternalRaw) ||
    Date.now() - lastExternalRaw >= 6 * 3600_000);
  const discoveryMode = intent.mode === "find_buyers" ? "find_buyers" : "find_sellers";
  const limit = Math.min(30, Math.max(Number(mandate.max_contacts || 3) * 4, 12));

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${AGENTIC_FUNCTION}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
        "x-waouh-owner-id": String(mandate.owner_id),
      },
      body: JSON.stringify({
        action: "nexus.global_discovery",
        payload: {
          query: intent.query_text,
          mode: discoveryMode,
          city: intent.city || null,
          budget_max: discoveryMode === "find_sellers" ? intent.budget_max : null,
          limit,
          refresh_external: refreshExternal,
          smart: false,
        },
      }),
    });
    const envelope = await response.json().catch(() => null);
    if (!response.ok || envelope?.ok !== true || !Array.isArray(envelope?.data?.results)) {
      throw new Error(String(envelope?.error?.message || envelope?.error?.code || `agentic_${response.status}`));
    }

    if (refreshExternal) {
      await sb.from("waouh_persistent_intents").update({
        metadata: {
          ...metadata,
          last_external_refresh_at: new Date().toISOString(),
          last_external_refresh_status: "ok",
          last_external_source_mix: envelope.data.source_mix ?? {},
        },
      }).eq("id", intent.id);
    }
    return {
      ok: true,
      refreshed_external: refreshExternal,
      results: envelope.data.results as any[],
      source_mix: envelope.data.source_mix ?? {},
    };
  } catch (error) {
    if (refreshExternal) {
      await sb.from("waouh_persistent_intents").update({
        metadata: {
          ...metadata,
          last_external_refresh_at: new Date().toISOString(),
          last_external_refresh_status: "failed",
          last_external_refresh_error: error instanceof Error ? error.message.slice(0, 160) : "unknown",
        },
      }).eq("id", intent.id);
    }
    console.warn("[waouh-opportunity-worker] NEXUS persistent discovery fallback", error);
    return { ok: false, refreshed_external: refreshExternal, results: [] as any[], source_mix: {} };
  }
}

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
  const nativeTargets: Array<{ channel: "sms" | "rcs"; tel_user_id: string; last4?: string | null; contact_id?: string | null; phone_hash?: string }> = [];
  let effectiveContactability = String(signal.contactability_level ?? "C0");
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
      .select("id,entity_id,submitted_by,contactability_level,contact_consent_basis,source_key,source_url,actor_name,actor_type,product_name,evidence")
      .eq("id", id).maybeSingle();
    externalSignal = data;
    entityId = data?.entity_id ?? null;
    if (entityId) {
      const { data: rows } = await sb.from("waouh_entity_contacts")
        .select("id,channel,value_encrypted,value_hash,value_last4,public_value,contactability_level,consent_state,is_public_business,verified_at,verification_status,last_success_at,last_failure_at,sent_count,reply_count,failure_count,is_whatsapp_reachable")
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

      // Native Messaging is considered actionable only when the phone is already
      // linked to a WAOUH Tel identity with an ACTIVE conversation consent.
      // We never synthesize consent from a public phone number.
      const phoneHashes = [...new Set(
        contacts
          .filter((row: any) => row.consent_state !== "revoked" && ["phone","whatsapp"].includes(String(row.channel || "")) && row.value_hash)
          .map((row: any) => String(row.value_hash)),
      )];
      if (phoneHashes.length) {
        const { data: telSettings } = await sb.from("waouh_tel_settings")
          .select("enabled,provider,sms_enabled,rcs_enabled")
          .eq("key", "default").maybeSingle();
        if (telSettings?.enabled === true && telSettings.provider !== "not_configured") {
          const { data: telUsers } = await sb.from("waouh_tel_users")
            .select("id,phone_hash,phone_last4,status")
            .in("phone_hash", phoneHashes)
            .eq("status", "active");
          const telIds = (telUsers ?? []).map((row: any) => row.id);
          if (telIds.length) {
            const [{ data: consents }, { data: capabilities }] = await Promise.all([
              sb.from("waouh_tel_consents")
                .select("tel_user_id,channel,status,purpose")
                .in("tel_user_id", telIds)
                .eq("status", "active")
                .eq("purpose", "conversation"),
              sb.from("waouh_tel_capabilities")
                .select("tel_user_id,rcs_reachable,expires_at")
                .in("tel_user_id", telIds),
            ]);
            const userById = new Map((telUsers ?? []).map((row: any) => [String(row.id), row]));
            const contactByHash = new Map(
              contacts
                .filter((row: any) => row.value_hash)
                .map((row: any) => [String(row.value_hash), row]),
            );
            const capabilityByUser = new Map((capabilities ?? []).map((row: any) => [String(row.tel_user_id), row]));
            for (const consent of consents ?? []) {
              const channel = String(consent.channel || "");
              if (channel === "sms" && telSettings.sms_enabled !== true) continue;
              if (channel === "rcs" && telSettings.rcs_enabled !== true) continue;
              if (!["sms","rcs"].includes(channel)) continue;
              const telUser = userById.get(String(consent.tel_user_id));
              if (!telUser) continue;
              const capability = capabilityByUser.get(String(consent.tel_user_id));
              const rcsFresh = channel !== "rcs" || !capability?.expires_at || Date.parse(capability.expires_at) > Date.now();
              const reachable = channel === "sms"
                ? true
                : (rcsFresh ? (capability?.rcs_reachable ?? null) : null);
              channels.push({
                channel,
                last4: telUser.phone_last4 ?? null,
                verified: true,
                reachable,
                public_business: false,
                consent_state: "opt_in",
              });
              nativeTargets.push({
                channel: channel as "sms" | "rcs",
                tel_user_id: String(telUser.id),
                phone_hash: String(telUser.phone_hash),
                last4: telUser.phone_last4 ?? null,
                contact_id: contactByHash.get(String(telUser.phone_hash))?.id ?? null,
              });
            }
            if (nativeTargets.length && ["C0","C1","C2"].includes(effectiveContactability)) {
              effectiveContactability = "C3";
              await sb.from("waouh_external_commerce_signals")
                .update({ contactability_level: "C3", updated_at: new Date().toISOString() })
                .eq("id", id);
              externalSignal = { ...externalSignal, contactability_level: "C3" };
            }
          }
        }
      }
    }
  }
  const pack = buildContactPack({
    fabricId,
    sourceKey,
    contactability: effectiveContactability,
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
  return { pack, externalSignal, contacts, nativeTargets, internal };
}

async function enrichPublicBusinessContact(sb: SupabaseClient, signal: any, resolved: any) {
  const external = resolved.externalSignal;
  if (!external?.entity_id || !external?.source_url) return resolved;
  if (String(external.actor_type || "") !== "business" ||
      String(external.contact_consent_basis || "") !== "public_business") return resolved;
  if (["R3","R4","R5"].includes(String(resolved.pack?.readiness_level || ""))) return resolved;

  const evidence = external.evidence && typeof external.evidence === "object" ? external.evidence : {};
  const lastAttempt = typeof evidence?.opportunity_os_contact_enrichment?.attempted_at === "string"
    ? Date.parse(evidence.opportunity_os_contact_enrichment.attempted_at) : NaN;
  if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < 24 * 3600_000) return resolved;

  let url: URL;
  try {
    url = new URL(String(external.source_url));
  } catch {
    return resolved;
  }
  if (!["https:","http:"].includes(url.protocol) || !isPublicHostname(url.hostname)) return resolved;
  try {
    await assertResolvesPublic(url.hostname);
  } catch {
    return resolved;
  }

  const attemptedAt = new Date().toISOString();
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY") || "";
  if (!firecrawlKey) {
    await sb.from("waouh_external_commerce_signals").update({
      evidence: {
        ...evidence,
        opportunity_os_contact_enrichment: { attempted_at: attemptedAt, status: "firecrawl_not_configured" },
      },
      updated_at: attemptedAt,
    }).eq("id", external.id);
    return resolved;
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url.toString(),
        formats: ["markdown","links"],
        onlyMainContent: true,
        timeout: 15000,
      }),
    });
    const raw = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`firecrawl_${response.status}`);
    const markdown = String(raw?.markdown ?? raw?.data?.markdown ?? "").slice(0, 30_000);
    const links = Array.isArray(raw?.links ?? raw?.data?.links) ? (raw.links ?? raw.data.links).slice(0, 50) : [];
    const hints = extractPublicContactHints([markdown, ...links].join("\n"));

    let stored = 0;
    for (const rawPhone of hints.phones.slice(0, 3)) {
      const e164 = normalizeE164(rawPhone);
      if (!e164) continue;
      const valueHash = await hashPhone(e164);
      const valueEncrypted = await encryptPhone(e164);
      const { data: existing } = await sb.from("waouh_entity_contacts")
        .select("id").eq("entity_id", external.entity_id)
        .eq("channel", "phone").eq("value_hash", valueHash).maybeSingle();
      const values = {
        source_key: external.source_key,
        value_encrypted: valueEncrypted,
        value_hash: valueHash,
        value_last4: phoneLast4(e164),
        public_value: null,
        is_public_business: true,
        consent_state: "public_business",
        contactability_level: "C1",
        verified_at: attemptedAt,
        verification_status: "observed",
        updated_at: attemptedAt,
      };
      const write = existing?.id
        ? await sb.from("waouh_entity_contacts").update(values).eq("id", existing.id)
        : await sb.from("waouh_entity_contacts").insert({ entity_id: external.entity_id, channel: "phone", ...values });
      if (!write.error) stored++;
    }

    for (const rawEmail of hints.emails.slice(0, 3)) {
      const email = rawEmail.trim().toLowerCase();
      if (!email) continue;
      const valueHash = await sha256Hex(email);
      const valueEncrypted = await encryptPhone(email);
      const { data: existing } = await sb.from("waouh_entity_contacts")
        .select("id").eq("entity_id", external.entity_id)
        .eq("channel", "email").eq("value_hash", valueHash).maybeSingle();
      const values = {
        source_key: external.source_key,
        value_encrypted: valueEncrypted,
        value_hash: valueHash,
        value_last4: null,
        public_value: null,
        is_public_business: true,
        consent_state: "public_business",
        contactability_level: "C1",
        verified_at: attemptedAt,
        verification_status: "observed",
        updated_at: attemptedAt,
      };
      const write = existing?.id
        ? await sb.from("waouh_entity_contacts").update(values).eq("id", existing.id)
        : await sb.from("waouh_entity_contacts").insert({ entity_id: external.entity_id, channel: "email", ...values });
      if (!write.error) stored++;
    }

    const nextEvidence = {
      ...evidence,
      opportunity_os_contact_enrichment: {
        attempted_at: attemptedAt,
        status: stored > 0 ? "contacts_found" : "no_contact_found",
        phone_count: hints.phones.length,
        email_count: hints.emails.length,
      },
    };
    await sb.from("waouh_external_commerce_signals").update({
      contactability_level: stored > 0 ? "C1" : external.contactability_level,
      evidence: nextEvidence,
      updated_at: attemptedAt,
    }).eq("id", external.id);

    if (stored > 0) {
      const refreshedSignal = { ...signal, contactability_level: "C1" };
      return await resolvePack(sb, refreshedSignal);
    }
    return resolved;
  } catch (error) {
    await sb.from("waouh_external_commerce_signals").update({
      evidence: {
        ...evidence,
        opportunity_os_contact_enrichment: {
          attempted_at: attemptedAt,
          status: "failed",
          error: error instanceof Error ? error.message.slice(0, 120) : "unknown",
        },
      },
      updated_at: attemptedAt,
    }).eq("id", external.id);
    return resolved;
  }
}

async function ensureJourney(sb: SupabaseClient, ownerId: string, mandate: any, signal: any, pack: any, matchScore: number) {
  const mandateArticleId = mandate.mode === "sell" &&
    mandate.metadata && typeof mandate.metadata === "object" &&
    typeof mandate.metadata.article_id === "string"
    ? mandate.metadata.article_id
    : null;
  const { data: existing } = await sb.from("waouh_opportunity_journeys")
    .select("*").eq("owner_id", ownerId).eq("fabric_id", signal.fabric_id)
    .eq("mandate_id", mandate.id).eq("mode", mandate.mode)
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) {
    await sb.from("waouh_opportunity_journeys").update({
      article_id: existing.article_id ?? mandateArticleId,
      readiness_level: pack.readiness_level,
      readiness_score: pack.readiness_score,
      actionability_score: pack.actionability_score,
      next_best_action: pack.next_best_action,
      contact_pack: pack,
      metadata: { ...(existing.metadata || {}), match_score: matchScore, worker_seen_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    return { ...existing, article_id: existing.article_id ?? mandateArticleId, mandate_id: mandate.id, contact_pack: pack };
  }
  const stage = pack.next_best_action === "CONTACT_NOW" || pack.next_best_action === "OPEN_DEAL_ROOM"
    ? "contact_ready" : "enriching";
  const { data, error } = await sb.from("waouh_opportunity_journeys").insert({
    owner_id: ownerId,
    mandate_id: mandate.id,
    article_id: mandateArticleId,
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

async function internalContactEndpoint(recipient: any) {
  const phone = normalizeE164(String(recipient.phone_number || ""));
  return phone ? `phone:${await hashPhone(phone)}` : `auth:${recipient.auth_user_id}`;
}

async function resolveInternalRecipient(sb: SupabaseClient, signal: any) {
  const evidence = signal.evidence && typeof signal.evidence === "object" ? signal.evidence : {};
  const waouhId = signal.fabric_id?.startsWith("buyer:")
    ? evidence.user_id
    : (evidence.seller_id || evidence.user_id);
  if (!waouhId) return null;
  const { data } = await sb.from("waouh_users")
    .select("id,auth_user_id,display_name,web_session_id,phone_number")
    .eq("id", waouhId).maybeSingle();
  return data?.auth_user_id ? data : null;
}

async function resolveMandateOwnerWaouhUser(sb: SupabaseClient, ownerAuthId: string) {
  const { data, error } = await sb.from("waouh_users")
    .select("id,auth_user_id,display_name,web_session_id,phone_number")
    .eq("auth_user_id", ownerAuthId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function openCanonicalInternalDeal(
  sb: SupabaseClient,
  mandate: any,
  signal: any,
  journey: any,
  target: { articleId?: string | null; catalogId?: string | null },
) {
  const owner = await resolveMandateOwnerWaouhUser(sb, String(mandate.owner_id));
  if (!owner?.id) return { contacted: false, reason: "mandate_owner_waouh_identity_missing" };

  const articleId = target.articleId ?? null;
  const catalogId = target.catalogId ?? null;
  const targetKey = articleId ? `article:${articleId}` : `catalog:${catalogId}`;
  if (!articleId && !catalogId) return { contacted: false, reason: "canonical_target_missing" };
  const ref = `autonomy:internal-deal:${mandate.id}:${targetKey}`;
  const { data: existingBus } = await sb.from("waouh_conversation_bus_events")
    .select("id,thread_id,negotiation_id")
    .eq("external_ref", ref)
    .maybeSingle();
  if (existingBus) {
    return {
      contacted: false,
      reason: "already_contacted",
      thread_id: existingBus.thread_id ?? journey.thread_id ?? null,
      negotiation_id: existingBus.negotiation_id ?? journey.negotiation_id ?? null,
    };
  }

  const recipient = await resolveInternalRecipient(sb, signal);
  if (recipient?.auth_user_id && !await claimAvatarContact(sb, mandate, journey, await internalContactEndpoint(recipient))) return { contacted: false, reason: "person_contact_cooldown" };
  const response = await fetch(`${SUPABASE_URL}/functions/v1/waouh-buyer-interest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(articleId ? { article_id: articleId } : {}),
      ...(catalogId ? { catalog_id: catalogId } : {}),
      buyer_user_id: owner.id,
      source: "avatar_commerce",
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.error) {
    return {
      contacted: false,
      reason: String(body?.error || `buyer_interest_${response.status}`),
    };
  }
  if (body?.skipped === "self") {
    return { contacted: false, reason: "self_article" };
  }
  const resolvedArticleId = typeof body?.article_id === "string" ? body.article_id : articleId;
  const threadId = typeof body?.thread_id === "string" ? body.thread_id : null;
  const negotiationId = typeof body?.negotiation_id === "string" ? body.negotiation_id : null;
  if (!threadId) {
    return { contacted: false, reason: "canonical_thread_missing" };
  }

  const now = new Date().toISOString();
  await sb.from("waouh_opportunity_journeys").update({
    article_id: resolvedArticleId,
    thread_id: threadId,
    negotiation_id: negotiationId,
    stage: "waiting_reply",
    contactability_level: "C4",
    readiness_level: "R4",
    readiness_score: 86,
    next_best_action: "WAIT_REPLY",
    contact_channel: "waouh",
    last_action: "autonomous_internal_deal_opened",
    next_action: "WAIT_REPLY",
    last_message: negotiationId
      ? "Avatar a ouvert le Deal Room et la négociation canonique. Réponse vendeur en attente."
      : "Avatar a ouvert le fil canonique. Réponse vendeur en attente.",
    last_activity_at: now,
    updated_at: now,
  }).eq("id", journey.id);

  await sb.rpc("waouh_append_conversation_bus_event", {
    p_owner_id: mandate.owner_id,
    p_event_type: "autonomy.internal_deal_opened",
    p_channel: "waouh",
    p_direction: "out",
    p_fabric_id: signal.fabric_id,
    p_journey_id: journey.id,
    p_mandate_id: mandate.id,
    p_article_id: resolvedArticleId,
    p_thread_id: threadId,
    p_negotiation_id: negotiationId,
    p_deal_id: null,
    p_external_ref: ref,
    p_payload: {
      source: "avatar_commerce",
      seller_notified: body?.seller_notified === true,
      duplicate_interest: body?.duplicate === true,
      workflow_state: body?.workflow_state ?? null,
    },
  });

  return {
    contacted: true,
    channel: "waouh",
    thread_id: threadId,
    negotiation_id: negotiationId,
    article_id: resolvedArticleId,
  };
}

async function contactInternal(
  sb: SupabaseClient,
  mandate: any,
  signal: any,
  journey: any,
  pack: any,
) {
  const permission = mandateAllowsContact(mandate, pack);
  if (!permission.allowed) {
    return { contacted: false, reason: permission.reason };
  }

  const articleId =
    journey.article_id ??
    (signal.fabric_id?.startsWith("article:") ? signal.fabric_id.slice("article:".length) :
      (signal.evidence?.article_id ?? null));
  const catalogId =
    signal.fabric_id?.startsWith("catalog:") ? signal.fabric_id.slice("catalog:".length) :
    (signal.evidence?.catalog_id ?? null);

  // BUY/ASK + article/catalogue WAOUH : one canonical writer. A catalog item is
  // first promoted to an article by waouh-buyer-interest, then the authoritative
  // thread_id/negotiation is returned and attached to the same Journey.
  if ((articleId || catalogId) && mandate.mode !== "sell") {
    return await openCanonicalInternalDeal(sb, mandate, signal, journey, {
      articleId: articleId ? String(articleId) : null,
      catalogId: catalogId ? String(catalogId) : null,
    });
  }

  if (mandate.allow_blind_message === false) return { contacted: false, reason: "mediation_not_allowed" };
  const recipient = await resolveInternalRecipient(sb, signal);
  if (!recipient?.auth_user_id || recipient.auth_user_id === mandate.owner_id) {
    return { contacted: false, reason: "internal_recipient_missing" };
  }
  const ref = `autonomy:waouh:${mandate.id}:${signal.fabric_id}`;
  const { data: already } = await sb.from("waouh_conversation_bus_events")
    .select("id").eq("external_ref", ref).maybeSingle();
  if (already) return { contacted: false, reason: "already_contacted" };

  if (!await claimAvatarContact(sb, mandate, journey, await internalContactEndpoint(recipient))) return { contacted: false, reason: "person_contact_cooldown" };
  const message = mandate.mode === "sell"
    ? `WAOUH accompagne un vendeur dont l’offre correspond à votre besoin « ${signal.subject || mandate.goal} ». Acceptez-vous que WAOUH poursuive cette mise en relation ?`
    : `WAOUH accompagne un acheteur intéressé par « ${signal.subject || mandate.goal} ». Acceptez-vous que WAOUH poursuive cette mise en relation ?`;

  const { data: approval, error: approvalError } = await sb.from("waouh_agent_approvals").insert({
    owner_id: recipient.auth_user_id,
    action_type: "send_message",
    action_summary: mandate.mode === "sell"
      ? "Un vendeur WAOUH souhaite répondre à votre besoin."
      : "Un acheteur WAOUH souhaite répondre à votre offre.",
    context: {
      operation: "opportunity_os.internal_mediated_contact",
      from_auth_user: mandate.owner_id,
      recipient_auth_user: recipient.auth_user_id,
      mandate_id: mandate.id,
      journey_id: journey.id,
      fabric_id: signal.fabric_id,
      source_key: signal.source_key,
      mode: mandate.mode,
      article_id: articleId || null,
    },
    status: "pending",
    expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
  }).select("id").single();
  if (approvalError) throw approvalError;

  const { error: notificationError } = await sb.from("waouh_notifications").insert({
    user_id: recipient.id,
    article_id: articleId || null,
    notification_type: "avatar_opportunity_contact",
    photos: [],
    payload: {
      text: `${message} Référence ${journeyReplyToken(journey.id)}`,
      fabric_id: signal.fabric_id,
      journey_id: journey.id,
      mandate_id: mandate.id,
      approval_id: approval.id,
      action_type: "send_message",
      from_auth_user: mandate.owner_id,
      source_key: signal.source_key,
      subject: signal.subject || mandate.goal,
      contactability_level: "C4",
      readiness_level: "R4",
      next_best_action: "WAIT_REPLY",
      action_url: "/app/missions",
      actions: [
        { id: "open-missions", label: "Répondre dans Missions" },
      ],
    },
    channel: "waouh_app",
    delivery_status: "delivered",
    delivered_at: new Date().toISOString(),
    web_session_id: recipient.web_session_id ?? null,
    dedupe_key: ref,
  });
  if (notificationError) throw notificationError;

  await sb.rpc("waouh_append_conversation_bus_event", {
    p_owner_id: mandate.owner_id,
    p_event_type: "autonomy.internal_contact_requested",
    p_channel: "waouh",
    p_direction: "out",
    p_fabric_id: signal.fabric_id,
    p_journey_id: journey.id,
    p_mandate_id: mandate.id,
    p_article_id: articleId || null,
    p_thread_id: journey.thread_id || null,
    p_negotiation_id: journey.negotiation_id || null,
    p_deal_id: journey.deal_id || null,
    p_external_ref: ref,
    p_payload: {
      approval_id: approval.id,
      recipient_auth_user_id: recipient.auth_user_id,
      recipient_waouh_user_id: recipient.id,
      notification_type: "avatar_opportunity_contact",
    },
  });
  await sb.from("waouh_opportunity_journeys").update({
    stage: "waiting_reply",
    contactability_level: "C4",
    readiness_level: "R4",
    readiness_score: 86,
    next_best_action: "WAIT_REPLY",
    contact_channel: "waouh",
    last_action: "autonomous_mediated_contact_requested",
    next_action: "WAIT_REPLY",
    last_message: "Avatar a transmis la demande dans WAOUH. Réponse de la contrepartie en attente.",
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", journey.id);
  return { contacted: true, channel: "waouh", approval_id: approval.id };
}

async function queueNativeOpportunityMessage(
  sb: SupabaseClient,
  mandate: any,
  signal: any,
  journey: any,
  resolved: any,
  channel: "sms" | "rcs",
  message: string,
  options: { followupIndex?: number | null } = {},
) {
  const target = (resolved.nativeTargets ?? []).find((row: any) => row.channel === channel);
  if (!target?.tel_user_id) return { contacted: false, reason: "native_target_missing" };

  if (!options.followupIndex && !await claimAvatarContact(sb, mandate, journey, `phone:${target.phone_hash}`)) return { contacted: false, reason: "person_contact_cooldown" };
  const suffix = options.followupIndex
    ? `followup:${options.followupIndex}`
    : "initial";
  const dedupe = `opportunity-os-native:${journey.id}:${suffix}:${channel}`;
  await enqueueTelMessage(sb, {
    targetUserId: target.tel_user_id,
    channelPreference: channel,
    bypassConsent: false,
    messageKind: "message",
    dedupeKey: dedupe,
    payload: {
      schema: "waouh.tel.outbound.v1",
      journey_id: journey.id, mandate_id: mandate.id,
      text: message,
    },
  });

  await sb.rpc("waouh_append_conversation_bus_event", {
    p_owner_id: mandate.owner_id,
    p_event_type: options.followupIndex
      ? "autonomy.native_followup_queued"
      : "autonomy.native_contact_queued",
    p_channel: channel,
    p_direction: "out",
    p_fabric_id: signal.fabric_id,
    p_journey_id: journey.id,
    p_mandate_id: mandate.id,
    p_article_id: journey.article_id || null,
    p_thread_id: journey.thread_id || null,
    p_negotiation_id: journey.negotiation_id || null,
    p_deal_id: journey.deal_id || null,
    p_external_ref: dedupe,
    p_payload: {
      native_tel_user_id: target.tel_user_id,
      contact_id: target.contact_id ?? null,
      phone_last4: target.last4 ?? null,
      source_key: signal.source_key,
      followup_index: options.followupIndex ?? null,
    },
  });

  const now = new Date().toISOString();
  await sb.from("waouh_opportunity_journeys").update({
    stage: "waiting_reply",
    contact_channel: channel,
    last_action: options.followupIndex
      ? "autonomous_native_followup_queued"
      : "autonomous_native_contact_queued",
    next_action: "WAIT_REPLY",
    last_message: options.followupIndex
      ? `Relance mise en file par ${channel.toUpperCase()}. Livraison en attente.`
      : `Contact mis en file par ${channel.toUpperCase()} selon votre mandat. Livraison en attente.`,
    last_activity_at: now,
    updated_at: now,
  }).eq("id", journey.id);

  const secret = await telRuntimeSecret("internal_secret").catch(() => "");
  if (secret) {
    const dispatchFn = Deno.env.get("WAOUH_TEL_DISPATCH_FUNCTION") || "waouh-e2e-test";
    const dispatch = fetch(`${SUPABASE_URL}/functions/v1/${dispatchFn}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 20, inbox_limit: 3, source: "opportunity_os" }),
    }).catch((error) => console.warn("[Opportunity OS] native dispatch", error));
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime?.waitUntil) runtime.waitUntil(dispatch);
  }

  return { contacted: true, channel };
}

async function contactExternal(sb: SupabaseClient, mandate: any, signal: any, journey: any, resolved: any) {
  const { pack, contacts, externalSignal } = resolved;
  if (!externalSignal?.entity_id) return { contacted: false, reason: "external_entity_missing" };
  const route = routeOpportunityChannel({
    channels: (pack.available_channels || []).map((row: any) => ({
      channel: row.channel,
      verified: row.verified,
      reachable: row.reachable,
      public_business: row.public_business,
      consent_state: row.consent_state,
      last4: row.last4,
    })),
    contactability: externalSignal.contactability_level || pack.contactability_level,
    allowWhatsapp: mandate.allow_whatsapp !== false,
    allowPublicBusiness: mandate.allow_public_business !== false,
    allowEmail: mandate.allow_email === true,
    allowSmsRcs: mandate.allow_sms_rcs === true,
    approvalGranted: journey.metadata?.contact_approved === true,
  });
  if (!route.can_dispatch) return { contacted: false, reason: route.reason };
  const permission = mandateAllowsContact(mandate, { ...pack, best_channel: route.primary_channel, next_best_action: journey.metadata?.contact_approved ? "CONTACT_NOW" : pack.next_best_action });
  if (!permission.allowed) return { contacted: false, reason: permission.reason };
  const message = mandate.mode === "sell"
    ? `Bonjour, WAOUH accompagne un vendeur dont l’offre correspond à votre besoin « ${signal.subject || mandate.goal} ». Souhaitez-vous poursuivre dans WAOUH ?`
    : `Bonjour, WAOUH accompagne un utilisateur intéressé par « ${signal.subject || mandate.goal} ». Souhaitez-vous poursuivre dans WAOUH ?`;

  if (route.primary_channel === "sms" || route.primary_channel === "rcs") {
    return await queueNativeOpportunityMessage(
      sb, mandate, signal, journey, resolved, route.primary_channel, message,
    );
  }
  if (!["whatsapp","phone"].includes(String(route.primary_channel || ""))) {
    return { contacted: false, reason: "provider_not_bound" };
  }

  const level = String(externalSignal.contactability_level || "C0");
  const target = contacts.find((row: any) => {
    if (row.consent_state === "revoked" || row.is_whatsapp_reachable !== true || !row.value_encrypted || !["whatsapp","phone"].includes(String(row.channel))) return false;
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

  if (!await claimAvatarContact(sb, mandate, journey, `phone:${await hashPhone(e164)}`)) return { contacted: false, reason: "person_contact_cooldown" };
  const dedupe = `opportunity-os:${mandate.id}:${signal.fabric_id}:${await sha256Hex(message)}`;
  const { error } = await sb.rpc("waouh_enqueue_outbound_v2", {
    p_to_phone: e164.replace(/\D/g, ""),
    p_to_user_id: null,
    p_template: "nexus_discovery_outreach",
    p_payload: {
      text: `${message} Référence ${journeyReplyToken(journey.id)} (à reprendre dans votre réponse).`,
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
    contact_channel: route.primary_channel === "phone" ? "whatsapp_via_public_phone" : "whatsapp",
    last_action: route.primary_channel === "phone"
      ? "autonomous_public_phone_whatsapp_probe_queued"
      : "autonomous_whatsapp_queued",
    next_action: "WAIT_REPLY",
    last_message: "Message préparé et mis en file. Confirmation d’envoi en attente.",
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", journey.id);
  return { contacted: true, channel: "whatsapp" };
}

async function runExternalFollowUp(
  sb: SupabaseClient,
  mandate: any,
  journey: any,
  signal: any,
  followupIndex: number,
) {
  const resolved = await resolvePack(sb, signal);
  const route = routeOpportunityChannel({
    channels: (resolved.pack.available_channels || []).map((row: any) => ({
      channel: row.channel,
      verified: row.verified,
      reachable: row.reachable,
      public_business: row.public_business,
      consent_state: row.consent_state,
      last4: row.last4,
    })),
    contactability: resolved.externalSignal?.contactability_level || resolved.pack.contactability_level,
    allowWhatsapp: mandate.allow_whatsapp !== false,
    allowPublicBusiness: mandate.allow_public_business !== false,
    allowEmail: mandate.allow_email === true,
    allowSmsRcs: mandate.allow_sms_rcs === true,
    approvalGranted: journey.metadata?.contact_approved === true,
  });
  if (!route.can_dispatch) {
    return { sent: false, reason: route.reason || "no_followup_channel" };
  }

  const message = `Bonjour, WAOUH revient vers vous concernant « ${signal.subject || mandate.goal} ». Souhaitez-vous poursuivre l’échange dans WAOUH ?`;
  if (route.primary_channel === "sms" || route.primary_channel === "rcs") {
    const native = await queueNativeOpportunityMessage(
      sb, mandate, signal, journey, resolved, route.primary_channel, message,
      { followupIndex },
    );
    return native.contacted
      ? { sent: true, channel: native.channel }
      : { sent: false, reason: native.reason };
  }
  if (!["whatsapp","phone"].includes(String(route.primary_channel || ""))) {
    return { sent: false, reason: "no_followup_channel" };
  }

  const level = String(resolved.externalSignal?.contactability_level || "C0");
  const target = resolved.contacts.find((row: any) => {
    if (row.consent_state === "revoked" || row.is_whatsapp_reachable !== true || !row.value_encrypted || !["whatsapp","phone"].includes(String(row.channel))) return false;
    if (level === "C1") {
      return mandate.allow_public_business !== false &&
        (row.is_public_business === true || row.consent_state === "public_business");
    }
    return ["C2","C3","C4","C5"].includes(String(row.contactability_level || level));
  });
  if (!target) return { sent: false, reason: "followup_contact_unavailable" };
  if (level === "C1" && mandate.require_approval_for_c1 === true) {
    return { sent: false, reason: "c1_requires_approval" };
  }

  const clear = await decryptPhone(target.value_encrypted);
  const e164 = normalizeE164(clear);
  if (!e164) return { sent: false, reason: "invalid_phone" };

  const dedupe = `opportunity-os-followup:${journey.id}:${followupIndex}`;
  const { error } = await sb.rpc("waouh_enqueue_outbound_v2", {
    p_to_phone: e164.replace(/\D/g, ""),
    p_to_user_id: null,
    p_template: "nexus_discovery_outreach",
    p_payload: {
      text: `${message} Référence ${journeyReplyToken(journey.id)} (à reprendre dans votre réponse).`,
      actions: [],
      fabric_id: signal.fabric_id,
      signal_id: resolved.externalSignal.id,
      source_key: signal.source_key,
      subject: signal.subject,
      initiated_by_auth_user: mandate.owner_id,
      mandate_id: mandate.id,
      journey_id: journey.id,
      contact_id: target.id,
      followup_index: followupIndex,
    },
    p_web_session_id: null,
    p_image_url: null,
    p_channel: "whatsapp",
    p_dedupe_key: dedupe,
    p_event_type: "opportunity_os_followup",
  });
  if (error) throw error;

  await sb.rpc("waouh_append_conversation_bus_event", {
    p_owner_id: mandate.owner_id,
    p_event_type: "autonomy.followup_queued",
    p_channel: "whatsapp",
    p_direction: "out",
    p_fabric_id: signal.fabric_id,
    p_journey_id: journey.id,
    p_mandate_id: mandate.id,
    p_article_id: journey.article_id || null,
    p_thread_id: journey.thread_id || null,
    p_negotiation_id: journey.negotiation_id || null,
    p_deal_id: journey.deal_id || null,
    p_external_ref: dedupe,
    p_payload: {
      followup_index: followupIndex,
      contact_id: target.id,
      phone_last4: target.value_last4,
    },
  });
  await sb.from("waouh_opportunity_journeys").update({
    last_action: "autonomous_followup_queued",
    next_action: "WAIT_REPLY",
    last_message: `Avatar a relancé cette opportunité (${followupIndex}/${mandate.max_followups}).`,
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", journey.id);
  return { sent: true, channel: "whatsapp" };
}

async function runInternalFollowUp(
  sb: SupabaseClient,
  mandate: any,
  journey: any,
  signal: any,
  followupIndex: number,
) {
  const recipient = await resolveInternalRecipient(sb, signal);
  if (!recipient?.id || recipient.auth_user_id === mandate.owner_id) {
    return { sent: false, reason: "internal_recipient_missing" };
  }
  const dedupe = `autonomy:internal-followup:${journey.id}:${followupIndex}`;
  const message = `Votre Avatar WAOUH vous rappelle l’opportunité « ${signal.subject || mandate.goal} ». Une contrepartie attend votre réponse.`;
  const articleId =
    signal.fabric_id?.startsWith("article:") ? signal.fabric_id.slice("article:".length) :
    (signal.evidence?.article_id ?? null);
  const { error } = await sb.from("waouh_notifications").insert({
    user_id: recipient.id,
    article_id: articleId || null,
    notification_type: "avatar_opportunity_followup",
    photos: [],
    payload: {
      text: message,
      fabric_id: signal.fabric_id,
      journey_id: journey.id,
      mandate_id: mandate.id,
      followup_index: followupIndex,
    },
    channel: "waouh_app",
    delivery_status: "delivered",
    delivered_at: new Date().toISOString(),
    web_session_id: recipient.web_session_id ?? null,
    dedupe_key: dedupe,
  });
  if (error && error.code !== "23505") throw error;

  await sb.rpc("waouh_append_conversation_bus_event", {
    p_owner_id: mandate.owner_id,
    p_event_type: "autonomy.followup_queued",
    p_channel: "waouh",
    p_direction: "out",
    p_fabric_id: signal.fabric_id,
    p_journey_id: journey.id,
    p_mandate_id: mandate.id,
    p_article_id: articleId || null,
    p_thread_id: journey.thread_id || null,
    p_negotiation_id: journey.negotiation_id || null,
    p_deal_id: journey.deal_id || null,
    p_external_ref: dedupe,
    p_payload: { followup_index: followupIndex, recipient_auth_user_id: recipient.auth_user_id },
  });
  await sb.from("waouh_opportunity_journeys").update({
    last_action: "autonomous_followup_queued",
    next_action: "WAIT_REPLY",
    last_message: `Avatar a relancé cette opportunité (${followupIndex}/${mandate.max_followups}).`,
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", journey.id);
  return { sent: true, channel: "waouh" };
}

async function runBoundedFollowUps(sb: SupabaseClient, limit = 30) {
  const cutoff = new Date(Date.now() - 3600_000).toISOString();
  const { data: journeys, error } = await sb.from("waouh_opportunity_journeys")
    .select("*")
    .eq("stage", "waiting_reply")
    .not("mandate_id", "is", null)
    .lt("last_activity_at", cutoff)
    .order("last_activity_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let sent = 0;
  let skipped = 0;
  let errors = 0;
  for (const journey of journeys ?? []) {
    try {
      const { data: mandate } = await sb.from("waouh_avatar_mandates")
        .select("*").eq("id", journey.mandate_id).maybeSingle();
      if (!mandate || mandate.status !== "active" || mandate.autonomy_mode === "assisted") {
        skipped++;
        continue;
      }
      if (["whatsapp", "phone"].includes(journey.contact_channel)) {
        const { data: delivery } = await sb.from("waouh_outbound_queue").select("id,status,payload")
          .contains("payload", { journey_id: journey.id }).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (delivery && ["pending", "processing", "queued", "retry"].includes(delivery.status)) { skipped++; continue; }
        if (delivery?.status === "failed") {
          const { data: signal } = await sb.from("waouh_signal_fabric").select("*").eq("fabric_id", journey.fabric_id).maybeSingle();
          const resolved = signal ? await resolvePack(sb, signal) : null;
          const alternate = mandate.allow_sms_rcs && resolved?.nativeTargets?.find((t: any) => ["sms", "rcs"].includes(t.channel));
          if (alternate && signal) {
            await queueNativeOpportunityMessage(sb, mandate, signal, journey, resolved, alternate.channel,
              `Bonjour, WAOUH vous contacte au sujet de « ${signal.subject || mandate.goal} ». Souhaitez-vous poursuivre ?`);
            sent++;
          } else {
            await sb.from("waouh_opportunity_journeys").update({ stage: "cancelled", last_action: "delivery_failed_no_fallback",
              last_message: "Échec de livraison du message. Aucun autre canal autorisé et configuré n’est disponible.", completed_at: new Date().toISOString() }).eq("id", journey.id);
            await avatarNotice(sb, mandate.owner_id, `delivery-failed:${delivery.id}`, "Le message n’a pas été livré. Avatar poursuit les autres pistes ; aucun canal de repli autorisé n’est disponible.", journey);
            skipped++;
          }
          continue;
        }
      }
      const maxFollowups = Math.max(0, Math.min(5, Number(mandate.max_followups || 0)));
      if (maxFollowups <= 0) {
        skipped++;
        continue;
      }
      const { count } = await sb.from("waouh_conversation_bus_events")
        .select("id", { count: "exact", head: true })
        .eq("journey_id", journey.id)
        .in("event_type", ["autonomy.followup_queued", "autonomy.native_followup_queued"]);
      const decision = boundedFollowUpDecision({
        autonomyMode: mandate.autonomy_mode,
        stage: journey.stage,
        lastActivityAt: journey.last_activity_at,
        maxFollowups,
        followupsSent: Number(count || 0),
        delayHours: Number(mandate.metadata?.followup_hours ?? followupDelayHours((Date.parse(mandate.expires_at) - Date.parse(mandate.created_at)) / 3600000, maxFollowups)),
      });
      if (!decision.due) {
        if (decision.reason === "followup_limit_reached") {
          await sb.from("waouh_opportunity_journeys").update({ stage: "cancelled", last_action: "no_response", last_message: "Aucune réponse après les relances autorisées. Avatar poursuit les autres pistes.", completed_at: new Date().toISOString() }).eq("id", journey.id);
          await avatarNotice(sb, mandate.owner_id, `no-reply:${journey.id}`, "Cette piste n’a pas répondu après vos relances. Consultez les autres opportunités.", journey);
        }
        skipped++;
        continue;
      }
      const followupIndex = decision.next_index;

      const { data: signal, error: signalError } = await sb.from("waouh_signal_fabric")
        .select("*").eq("fabric_id", journey.fabric_id).maybeSingle();
      if (signalError || !signal) {
        skipped++;
        continue;
      }

      const result = String(signal.fabric_id || "").startsWith("external:")
        ? await runExternalFollowUp(sb, mandate, journey, signal, followupIndex)
        : await runInternalFollowUp(sb, mandate, journey, signal, followupIndex);
      if (result.sent) sent++;
      else skipped++;
    } catch (error) {
      console.warn("[waouh-opportunity-worker] followup", error);
      errors++;
    }
  }
  return { sent, skipped, errors };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  if (!isServiceCaller(req, SERVICE_ROLE) && !(await isTickCaller(req, sb))) {
    return json({ ok: false, code: "service_role_required" }, 401);
  }

  const lease = crypto.randomUUID();
  const { data: claimed, error: claimError } = await sb.rpc("waouh_avatar_claim_worker", { p_token: lease });
  if (claimError) return json({ ok: false, code: "worker_claim_failed" }, 500);
  if (!claimed) return json({ ok: true, skipped: "worker_already_running" });
  const started = Date.now();
  try {
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(50, Math.max(1, Number(body?.limit) || 20));
  const requestedMandateId = typeof body?.mandate_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.mandate_id)
    ? body.mandate_id
    : null;
  const now = new Date();
  const { error: bridgeError } = await sb.rpc("waouh_avatar_bridge_missions", { p_limit: 20 });
  if (bridgeError) throw bridgeError;
  const maintenance = await maintainAvatarQueues(sb);
  const lifecycle = await advanceAvatarLifecycle(sb, 15);
  const { data: expired } = await sb.from("waouh_avatar_mandates").update({ status: "expired" })
    .eq("status", "active").is("metadata->agreement_reached_at", null).lt("expires_at", now.toISOString()).select("id,owner_id,contacted_count,replied_count");
  for (const m of expired ?? []) {
    await sb.from("waouh_opportunity_journeys").update({ stage: "cancelled", last_action: "mandate_expired", completed_at: now.toISOString(),
      last_message: "Délai de mission atteint. Aucun nouvel envoi ne sera effectué." }).eq("mandate_id", m.id).in("stage", ["discovered", "enriching", "contact_ready", "contacting", "waiting_reply"]);
    await avatarNotice(sb, m.owner_id, `avatar-expired:${m.id}`, `Mission arrivée à échéance : ${m.contacted_count} contacts sollicités, ${m.replied_count} réponses. Consultez les pistes ou créez un nouveau mandat.`, { mandate_id: m.id });
  }
  await sb.from("waouh_persistent_intents").update({ status: "expired" })
    .eq("status", "active").lt("expires_at", now.toISOString());

  let intentQuery = sb.from("waouh_persistent_intents")
    .select("*,waouh_avatar_mandates(*)")
    .eq("status", "active");
  if (requestedMandateId) {
    // Immediate wake after explicit mandate creation/run. This endpoint remains
    // service/tick-only; users cannot bypass mandate ownership or limits.
    intentQuery = intentQuery.eq("mandate_id", requestedMandateId);
  } else {
    intentQuery = intentQuery.lte("next_scan_at", new Date().toISOString());
  }
  const { data: intents, error } = await intentQuery
    .order("next_scan_at", { ascending: true })
    .limit(limit);
  if (error) return json({ ok: false, code: "intent_load_failed", message: error.message }, 500);

  const result = { scanned_intents: 0, matches: 0, actionable: 0, contacted: 0, skipped: 0, errors: 0 };
  for (const intent of intents ?? []) {
    if (Date.now() - started > 65000) break;
    result.scanned_intents++;
    try {
      const mandate = intent.waouh_avatar_mandates;
      if (!mandate || mandate.status !== "active" || mandate.metadata?.agreement_reached_at) {
        result.skipped++;
        continue;
      }
      const maxContacts = Math.max(1, Math.min(20, Number(mandate.max_contacts || 3)));
      const remainingContacts = remainingContactCapacity(maxContacts, mandate.contacted_count);
      if (remainingContacts <= 0) {
        const nextAt = new Date(Date.now() + 24 * 3600_000).toISOString();
        await sb.from("waouh_persistent_intents").update({
          last_scan_at: new Date().toISOString(),
          next_scan_at: nextAt,
          metadata: {
            ...(intent.metadata || {}),
            contact_limit_reached: true,
            contact_limit: maxContacts,
          },
        }).eq("id", intent.id);
        result.skipped++;
        continue;
      }

      const nexusDiscovery = await discoverPersistentIntentWithNexus(sb, intent, mandate);
      let ranked: any[] = nexusDiscovery.results;
      if (!nexusDiscovery.ok) {
        const desired = intent.mode === "find_buyers" ? ["BUY","RFQ"] : ["SELL","ANNOUNCE"];
        const { data: signals, error: signalError } = await sb.from("waouh_signal_fabric")
          .select("*").in("intent", desired).order("observed_at", { ascending: false }).limit(1500);
        if (signalError) throw signalError;
        ranked = (signals ?? []).map((signal: FabricSignal) => ({
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
      } else {
        ranked = ranked
          .filter((row: any) => Number(row.scores?.total_score || 0) >= Number(intent.min_match_score || 75))
          .slice(0, Math.max(Number(mandate.max_contacts || 3) * 4, 12));
      }
      ranked = ranked.filter((signal: any) => withinMandateBudget(mandate, signal));
      result.matches += ranked.length;
      await finishLegacySearch(sb, mandate, ranked);
      if (mandate.metadata?.completion_goal === "recommendations") continue;

      let contactedThisRun = 0;
      let actionableThisRun = 0;
      const visited = new Set<string>();
      for (let signal of ranked) {
        if (Date.now() - started > 65000) break;
        if (/^(radar|legacy_external):/.test(signal.fabric_id)) {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/${AGENTIC_FUNCTION}`, {
            method: "POST", headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json", "x-waouh-owner-id": mandate.owner_id },
            body: JSON.stringify({ action: "nexus.legacy.promote", payload: { fabric_id: signal.fabric_id } }), signal: AbortSignal.timeout(15000),
          });
          const promoted = await response.json();
          if (response.ok && promoted.data?.signal) signal = { ...promoted.data.signal, scores: signal.scores };
        }
        if (visited.has(signal.fabric_id)) continue;
        visited.add(signal.fabric_id);
        if (contactedThisRun >= remainingContacts) break;
        let resolved = await resolvePack(sb, signal);
        if (!["R3","R4","R5"].includes(String(resolved.pack?.readiness_level || ""))) {
          resolved = await enrichPublicBusinessContact(sb, signal, resolved);
        }
        if (resolved.pack?.readiness_level === "R3" && mandate.allow_whatsapp && resolved.externalSignal?.contactability_level !== "C0") {
          const contact = resolved.contacts.find((c: any) => ["phone", "whatsapp"].includes(c.channel) && c.value_encrypted && c.consent_state !== "revoked" && c.is_whatsapp_reachable == null);
          if (contact) {
            const phone = await decryptPhone(contact.value_encrypted);
            const check = await fetch(`${SUPABASE_URL}/functions/v1/waouh-check-whatsapp`, { method: "POST",
              headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" }, body: JSON.stringify({ phone }), signal: AbortSignal.timeout(10000) });
            const verdict = await check.json();
            if (check.ok && verdict.ok === true) {
              await sb.from("waouh_entity_contacts").update({ is_whatsapp_reachable: verdict.isWhatsApp === true,
                verification_status: verdict.isWhatsApp ? "reachable" : "unreachable", verified_at: new Date().toISOString() }).eq("id", contact.id);
              resolved = await resolvePack(sb, signal);
            }
          }
        }
        const pack = resolved.pack;
        if (Number(pack.actionability_score || 0) < Number(intent.min_actionability_score || 65)) {
          await ensureJourney(sb, mandate.owner_id, mandate, signal, pack, Number(signal.scores?.total_score || 0));
          continue;
        }
        actionableThisRun++;
        result.actionable++;
        const journey = await ensureJourney(sb, mandate.owner_id, mandate, signal, pack, Number(signal.scores.total_score || 0));
        if (["waiting_reply", "negotiating", "agreed", "executing", "completed", "cancelled"].includes(journey.stage)) continue;
        if ((mandate.autonomy_mode === "assisted" || pack.next_best_action === "REQUEST_APPROVAL") && !journey.metadata?.contact_approved) {
          await requestAvatarApproval(sb, mandate, journey, "send_message", `contact:${journey.id}`, `Autoriser Avatar à contacter cette piste : ${signal.subject || mandate.goal} ?`);
          continue;
        }
        const authorizedMandate = journey.metadata?.contact_approved ? { ...mandate, autonomy_mode: "semi_autonomous", require_approval_for_c1: false } : mandate;
        const authorizedPack = journey.metadata?.contact_approved ? { ...pack, next_best_action: "CONTACT_NOW" } : pack;
        let contactResult: any;
        if (resolved.internal) contactResult = await contactInternal(sb, authorizedMandate, signal, journey, authorizedPack);
        else contactResult = await contactExternal(sb, authorizedMandate, signal, journey, { ...resolved, pack: authorizedPack });
        if (contactResult.contacted) {
          contactedThisRun++;
          result.contacted++;
        } else {
          result.skipped++;
          await sb.from("waouh_opportunity_journeys").update({ last_action: contactResult.reason || "channel_unavailable", next_action: "Vérifier le canal ou choisir une autre piste", last_message: "Le contact n’a pas encore été envoyé. Une autre voie de contact est nécessaire." }).eq("id", journey.id);
        }
      }

      const nextAt = new Date(Date.now() + Number(intent.scan_interval_minutes || 60) * 60_000).toISOString();
      await sb.from("waouh_persistent_intents").update({
        last_scan_at: new Date().toISOString(),
        next_scan_at: nextAt,
        last_result_count: ranked.length,
        metadata: { ...(intent.metadata || {}), coverage: { candidate_count: ranked.length, fallback_used: !nexusDiscovery.ok, corpus_limit: nexusDiscovery.ok ? 3500 : 1500, measured_at: new Date().toISOString() } },
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

  const followups = await runBoundedFollowUps(sb, Math.min(50, limit * 2));
  if (result.contacted > 0 || followups.sent > 0) {
    fetch(`${SUPABASE_URL}/functions/v1/waouh-outbound-dispatch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: Math.min(100, Math.max(20, (result.contacted + followups.sent) * 3)) }),
    }).catch(() => {});
  }
  return json({ ok: true, ...result, followups, lifecycle, maintenance });
  } finally {
    await sb.rpc("waouh_avatar_release_worker", { p_token: lease });
  }
});
