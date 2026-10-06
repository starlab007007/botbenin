import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { decryptPhone, encryptPhone, hashPhone } from "../_shared/waouh-tel/crypto.ts";
import { normalizeE164, phoneLast4, providerPhone } from "../_shared/waouh-tel/phone.ts";
import { extractPublicContactHints } from "../_shared/waouh-signal-fabric.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const WAHA_BASE_URL = (Deno.env.get("WAHA_BASE_URL") || "").replace(/\/$/, "");
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY") || "";
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";

function countBy(rows: any[], key: string) {
  return rows.reduce((acc: Record<string, number>, row: any) => {
    const value = String(row?.[key] ?? "unknown");
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function isAvatarMessage(message: any) {
  const meta = message?.meta || {};
  const origin = String(meta.origin_surface || meta.source || meta.surface || "").toLowerCase();
  return origin.includes("avatar");
}

function isMuseMessage(message: any) {
  const meta = message?.meta || {};
  const origin = String(meta.origin_surface || meta.source || meta.surface || "").toLowerCase();
  return origin.includes("muse") || origin.includes("mission");
}


type ResolvedAdminContact = {
  id: string | null;
  fabric_id: string;
  source_key: string;
  label: string | null;
  channel: string;
  value: string;
  normalized_e164: string | null;
  whatsapp_chat_id: string | null;
  value_last4: string | null;
  contactability_level: string;
  consent_state: string;
  is_public_business: boolean;
  is_whatsapp_reachable: boolean | null;
  can_notify_whatsapp: boolean;
  notify_reason: string;
  entity_id: string | null;
};

function uniqStrings(values: unknown[], max = 300) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))).slice(0, max);
}

function sourceAllowsDirectWhatsApp(source: any) {
  const key = String(source?.source_key || "");
  const family = String(source?.family || "");
  if (["waouh_app", "whatsapp", "partner", "status", "google_places", "facebook_business", "instagram_business", "benin_directory"].includes(key)) return true;
  return ["internal", "partner", "messaging"].includes(family);
}

function normalizedPhone(raw: unknown) {
  const e164 = normalizeE164(raw);
  if (!e164) return null;
  return {
    e164,
    chatId: `${providerPhone(e164)}@c.us`,
    last4: phoneLast4(e164),
  };
}

function beninProviderCandidates(e164: string) {
  const canonical = providerPhone(e164);
  const out = [canonical];
  if (canonical.startsWith("22901") && canonical.length === 13) {
    out.push(`229${canonical.slice(5)}`);
  } else if (canonical.startsWith("229") && canonical.length === 11) {
    out.push(`22901${canonical.slice(3)}`);
  }
  return Array.from(new Set(out));
}

async function adminWahaHealth() {
  if (!WAHA_BASE_URL) {
    return { ready: false, session: WAHA_SESSION, status: "NOT_CONFIGURED", reason: "waha_not_configured" };
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (WAHA_API_KEY) headers["X-Api-Key"] = WAHA_API_KEY;
  try {
    const response = await fetch(`${WAHA_BASE_URL}/api/sessions/${encodeURIComponent(WAHA_SESSION)}`, {
      headers,
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) {
      return { ready: false, session: WAHA_SESSION, status: `HTTP_${response.status}`, reason: "waha_status_failed" };
    }
    const body = await response.json().catch(() => ({}));
    const status = String(body?.status || "UNKNOWN").toUpperCase();
    const ready = ["WORKING", "READY", "AUTHENTICATED", "CONNECTED"].includes(status);
    return {
      ready,
      session: WAHA_SESSION,
      status,
      reason: ready ? null : status === "SCAN_QR_CODE" ? "qr_required" : "waha_not_ready",
    };
  } catch (error: any) {
    return {
      ready: false,
      session: WAHA_SESSION,
      status: "UNREACHABLE",
      reason: String(error?.message || "waha_unreachable"),
    };
  }
}

async function adminWahaCheck(e164: string) {
  if (!WAHA_BASE_URL) return { reachable: null as boolean | null, chatId: null as string | null, reason: "waha_not_configured" };
  const headers: Record<string, string> = { Accept: "application/json" };
  if (WAHA_API_KEY) headers["X-Api-Key"] = WAHA_API_KEY;
  for (const candidate of beninProviderCandidates(e164)) {
    const routes = [
      `/api/${encodeURIComponent(WAHA_SESSION)}/contacts/check-exists?phone=${encodeURIComponent(candidate)}`,
      `/api/contacts/check-exists?phone=${encodeURIComponent(candidate)}&session=${encodeURIComponent(WAHA_SESSION)}`,
    ];
    for (const route of routes) {
      try {
        const response = await fetch(`${WAHA_BASE_URL}${route}`, {
          headers,
          signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) continue;
        const body = await response.json().catch(() => null);
        if (body && (body.numberExists === true || body.exists === true)) {
          return {
            reachable: true,
            chatId: typeof body.chatId === "string" ? body.chatId : `${candidate}@c.us`,
            reason: null,
          };
        }
      } catch (_) {}
    }
  }
  return { reachable: false, chatId: null, reason: "not_on_whatsapp" };
}

async function resolveAdminSignalContacts(sb: any, fabricIds: string[]) {
  const { data: fabricRows, error: fabricError } = await sb
    .from("waouh_signal_fabric")
    .select("fabric_id,source_record_id,source_key,contactability_level,raw_text,source_url,evidence")
    .in("fabric_id", fabricIds);
  if (fabricError) throw fabricError;

  const { data: sourceRows, error: sourceError } = await sb
    .from("waouh_discovery_sources")
    .select("source_key,family,supports_contact,default_contactability");
  if (sourceError) throw sourceError;
  const sourceMap = new Map((sourceRows || []).map((row: any) => [String(row.source_key), row]));

  const articleIds = uniqStrings((fabricRows || []).map((row: any) => row.evidence?.article_id), 500);
  const buyerIds = uniqStrings((fabricRows || []).map((row: any) => row.evidence?.buyer_profile_id), 500);
  const catalogIds = uniqStrings((fabricRows || []).map((row: any) => row.evidence?.catalog_id), 500);
  const radarIds = uniqStrings((fabricRows || []).map((row: any) => row.evidence?.radar_signal_id), 500);
  const externalIds = uniqStrings(
    (fabricRows || []).filter((row: any) => String(row.fabric_id).startsWith("external:"))
      .map((row: any) => String(row.fabric_id).slice("external:".length)),
    500,
  );

  const [articles, buyers, catalogs, radar, external] = await Promise.all([
    articleIds.length
      ? sb.from("waouh_articles").select("id,seller_id,contact_whatsapp,partner_id").in("id", articleIds)
      : Promise.resolve({ data: [], error: null }),
    buyerIds.length
      ? sb.from("waouh_buyer_profiles").select("id,user_id,contact_whatsapp").in("id", buyerIds)
      : Promise.resolve({ data: [], error: null }),
    catalogIds.length
      ? sb.from("waouh_unified_catalog").select("id,vendeur_nom,vendeur_phone,vendeur_whatsapp,partner_id,business_id,verified").in("id", catalogIds)
      : Promise.resolve({ data: [], error: null }),
    radarIds.length
      ? sb.from("waouh_radar_signals").select("id,contact_phone,contact_handle,waouh_user_id,source_type").in("id", radarIds)
      : Promise.resolve({ data: [], error: null }),
    externalIds.length
      ? sb.from("waouh_external_commerce_signals").select("id,entity_id,actor_name,contact_consent_basis,source_key").in("id", externalIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const query of [articles, buyers, catalogs, radar, external]) if (query.error) throw query.error;

  const articleMap = new Map((articles.data || []).map((row: any) => [String(row.id), row]));
  const buyerMap = new Map((buyers.data || []).map((row: any) => [String(row.id), row]));
  const catalogMap = new Map((catalogs.data || []).map((row: any) => [String(row.id), row]));
  const radarMap = new Map((radar.data || []).map((row: any) => [String(row.id), row]));
  const externalMap = new Map((external.data || []).map((row: any) => [String(row.id), row]));

  const userIds = new Set<string>();
  for (const row of fabricRows || []) {
    if (row.evidence?.seller_id) userIds.add(String(row.evidence.seller_id));
    if (row.evidence?.user_id) userIds.add(String(row.evidence.user_id));
  }
  for (const row of articles.data || []) if (row.seller_id) userIds.add(String(row.seller_id));
  for (const row of buyers.data || []) if (row.user_id) userIds.add(String(row.user_id));
  for (const row of radar.data || []) if (row.waouh_user_id) userIds.add(String(row.waouh_user_id));

  const users = userIds.size
    ? await sb.from("waouh_users").select("id,phone_number,display_name,auth_user_id").in("id", Array.from(userIds))
    : { data: [], error: null };
  if (users.error) throw users.error;
  const userMap = new Map((users.data || []).map((row: any) => [String(row.id), row]));

  const entityIds = uniqStrings((external.data || []).map((row: any) => row.entity_id), 500);
  const entityContacts = entityIds.length
    ? await sb.from("waouh_entity_contacts")
      .select("id,entity_id,channel,value_encrypted,public_value,value_last4,source_key,is_public_business,consent_state,contactability_level,is_whatsapp_reachable,verification_status")
      .in("entity_id", entityIds)
    : { data: [], error: null };
  if (entityContacts.error) throw entityContacts.error;
  const contactsByEntity = new Map<string, any[]>();
  for (const contact of entityContacts.data || []) {
    const key = String(contact.entity_id);
    contactsByEntity.set(key, [...(contactsByEntity.get(key) || []), contact]);
  }

  const result: Record<string, ResolvedAdminContact[]> = {};
  const add = (fabricRow: any, raw: unknown, meta: any = {}) => {
    const text = String(raw ?? "").trim();
    if (!text) return;
    const channel = String(meta.channel || "phone");
    const normalized = ["phone", "whatsapp"].includes(channel) ? normalizedPhone(text) : null;
    const source = sourceMap.get(String(fabricRow.source_key)) || {};
    const level = String(meta.contactability_level || fabricRow.contactability_level || source.default_contactability || "C0");
    const consentState = String(meta.consent_state || "unknown");
    const isPublicBusiness = meta.is_public_business === true;
    const allowedConsent = isPublicBusiness ||
      ["public_business", "initiated", "opt_in", "partner_contract"].includes(consentState);
    const directSource = sourceAllowsDirectWhatsApp({ ...source, source_key: fabricRow.source_key });
    const canNotify = !!normalized && level !== "C0" && (allowedConsent || directSource);
    const item: ResolvedAdminContact = {
      id: meta.id ?? null,
      fabric_id: String(fabricRow.fabric_id),
      source_key: String(fabricRow.source_key),
      label: meta.label ?? null,
      channel,
      value: normalized?.e164 || text,
      normalized_e164: normalized?.e164 || null,
      whatsapp_chat_id: normalized?.chatId || null,
      value_last4: normalized?.last4 || meta.value_last4 || null,
      contactability_level: level,
      consent_state: consentState,
      is_public_business: isPublicBusiness,
      is_whatsapp_reachable: meta.is_whatsapp_reachable ?? null,
      can_notify_whatsapp: canNotify,
      notify_reason: !normalized
        ? "contact_non_telephonique"
        : canNotify
          ? (allowedConsent ? "autorise_par_consentement_ou_contact_public" : "canal_waouh_ou_partenaire")
          : "notification_whatsapp_non_autorisee",
      entity_id: meta.entity_id ?? null,
    };
    const key = item.normalized_e164 ? `phone:${item.normalized_e164}` : `${item.channel}:${item.value}`;
    const current = result[item.fabric_id] || [];
    if (!current.some((existing) => {
      const existingKey = existing.normalized_e164 ? `phone:${existing.normalized_e164}` : `${existing.channel}:${existing.value}`;
      return existingKey === key;
    })) {
      current.push(item);
      result[item.fabric_id] = current;
    }
  };

  const addUser = (fabricRow: any, userId: unknown, label: string) => {
    const user = userId ? userMap.get(String(userId)) : null;
    if (!user?.phone_number) return;
    add(fabricRow, user.phone_number, {
      channel: "whatsapp",
      label: user.display_name || label,
      contactability_level: fabricRow.contactability_level || "C2",
      consent_state: "initiated",
      is_public_business: false,
    });
  };

  for (const row of fabricRows || []) {
    result[String(row.fabric_id)] = result[String(row.fabric_id)] || [];
    const evidence = row.evidence || {};
    const source = sourceMap.get(String(row.source_key)) || {};
    const article = evidence.article_id ? articleMap.get(String(evidence.article_id)) : null;
    const buyer = evidence.buyer_profile_id ? buyerMap.get(String(evidence.buyer_profile_id)) : null;
    const catalog = evidence.catalog_id ? catalogMap.get(String(evidence.catalog_id)) : null;
    const radarRow = evidence.radar_signal_id ? radarMap.get(String(evidence.radar_signal_id)) : null;
    const externalSignal = String(row.fabric_id).startsWith("external:")
      ? externalMap.get(String(row.fabric_id).slice("external:".length))
      : null;

    if (article) {
      if (article.contact_whatsapp) add(row, article.contact_whatsapp, {
        channel: "whatsapp",
        label: "WhatsApp annonce",
        contactability_level: article.partner_id ? "C4" : (row.contactability_level || "C2"),
        consent_state: article.partner_id ? "partner_contract" : "initiated",
        is_public_business: !!article.partner_id,
      });
      addUser(row, article.seller_id, "Vendeur WAOUH");
    }
    if (buyer) {
      if (buyer.contact_whatsapp) add(row, buyer.contact_whatsapp, {
        channel: "whatsapp",
        label: "WhatsApp acheteur",
        contactability_level: row.contactability_level || "C2",
        consent_state: "initiated",
        is_public_business: false,
      });
      addUser(row, buyer.user_id, "Acheteur WAOUH");
    }
    if (catalog) {
      if (catalog.vendeur_whatsapp) add(row, catalog.vendeur_whatsapp, {
        channel: "whatsapp",
        label: catalog.vendeur_nom || "WhatsApp catalogue",
        contactability_level: catalog.partner_id ? "C4" : (row.contactability_level || source.default_contactability || "C1"),
        consent_state: (catalog.partner_id || catalog.business_id) ? "partner_contract" : "unknown",
        is_public_business: !!catalog.partner_id || !!catalog.business_id,
      });
      if (catalog.vendeur_phone) add(row, catalog.vendeur_phone, {
        channel: "phone",
        label: catalog.vendeur_nom || "Téléphone catalogue",
        contactability_level: catalog.partner_id ? "C4" : (row.contactability_level || source.default_contactability || "C1"),
        consent_state: (catalog.partner_id || catalog.business_id) ? "partner_contract" : "unknown",
        is_public_business: !!catalog.partner_id || !!catalog.business_id,
      });
    }
    if (radarRow?.contact_phone) {
      const radarBusinessSource = ["google_places", "facebook_business", "instagram_business", "benin_directory"]
        .includes(String(radarRow.source_type || row.source_key));
      add(row, radarRow.contact_phone, {
        channel: "phone",
        label: "Contact Radar",
        contactability_level: row.contactability_level || source.default_contactability || "C0",
        consent_state: radarBusinessSource ? "public_business" : "unknown",
        is_public_business: radarBusinessSource,
      });
    }
    if (radarRow?.waouh_user_id) addUser(row, radarRow.waouh_user_id, "Contact WAOUH Radar");

    addUser(row, evidence.seller_id, "Vendeur WAOUH");
    addUser(row, evidence.user_id, "Utilisateur WAOUH");

    if (externalSignal?.entity_id) {
        for (const stored of contactsByEntity.get(String(externalSignal.entity_id)) || []) {
          let value = String(stored.public_value || "").trim();
          if (!value && stored.value_encrypted) {
            try { value = await decryptPhone(stored.value_encrypted); } catch (_) { value = ""; }
          }
          if (!value) continue;
          add(row, value, {
            id: stored.id,
            entity_id: stored.entity_id,
            channel: stored.channel,
            label: externalSignal.actor_name || "Contact NEXUS",
            value_last4: stored.value_last4,
            contactability_level: stored.contactability_level,
            consent_state: stored.consent_state,
            is_public_business: stored.is_public_business === true,
            is_whatsapp_reachable: stored.is_whatsapp_reachable,
          });
        }
      }

    const hints = Array.isArray(evidence.contact_hints) ? evidence.contact_hints : [];
    for (const hint of hints.slice(0, 10)) {
      const raw = typeof hint === "string" ? hint : String(hint?.value || hint?.phone || hint?.whatsapp || "");
      if (!raw) continue;
      add(row, raw, {
        channel: "phone",
        label: "Contact public détecté",
        contactability_level: row.contactability_level || source.default_contactability || "C0",
        consent_state: sourceAllowsDirectWhatsApp({ ...source, source_key: row.source_key }) ? "public_business" : "unknown",
        is_public_business: ["google_places", "facebook_business", "instagram_business", "benin_directory"].includes(String(row.source_key)),
      });
    }

    const publicText = [
      row.raw_text,
      typeof evidence.raw_text === "string" ? evidence.raw_text : null,
      typeof evidence.description === "string" ? evidence.description : null,
      typeof evidence.contact === "string" ? evidence.contact : null,
    ].filter(Boolean).join("\n");
    const extracted = extractPublicContactHints(publicText);
    for (const raw of extracted.phones) {
      const extractedBusinessContact = ["google_places", "facebook_business", "instagram_business", "benin_directory"]
        .includes(String(row.source_key));
      add(row, raw, {
        entity_id: externalSignal?.entity_id || null,
        channel: "phone",
        label: "Téléphone extrait de la source",
        contactability_level: row.contactability_level || source.default_contactability || "C0",
        consent_state: extractedBusinessContact ? "public_business" : "unknown",
        is_public_business: extractedBusinessContact,
      });
    }
  }

  return result;
}

async function auditContactCenter(sb: any, actorId: string, action: string, afterState: any) {
  const { error } = await sb.from("waouh_admin_control_audit").insert({
    module_key: "signal_fabric_contact_center",
    actor_id: actorId,
    action,
    before_state: {},
    after_state: afterState,
  });
  if (error) console.warn("[waouh-admin-stats] contact center audit:", error.message);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "authentication_required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "invalid_session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const [adminRole, superAdminRole] = await Promise.all([
      sb.rpc("has_role", { _user_id: user.id, _role_name: "admin" }),
      sb.rpc("has_role", { _user_id: user.id, _role_name: "super_admin" }),
    ]);
    if (!adminRole.data && !superAdminRole.data) {
      return new Response(JSON.stringify({ error: "admin_required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestBody = req.method === "POST"
      ? await req.json().catch(() => ({})) as Record<string, unknown>
      : {};
    const action = String(requestBody.action ?? "stats");

    if (action === "signal_contacts_resolve" || action === "signal_contacts_sync_waha" || action === "signal_contacts_notify_waha") {
      const fabricIds = uniqStrings(
        Array.isArray(requestBody.fabric_ids) ? requestBody.fabric_ids : [requestBody.fabric_id],
        300,
      );
      if (!fabricIds.length) throw new Error("fabric_id_required");
      const contactMap = await resolveAdminSignalContacts(sb, fabricIds);

      if (action === "signal_contacts_resolve") {
        const waha = await adminWahaHealth();
        return new Response(JSON.stringify({
          ok: true,
          waha,
          rows: fabricIds.map((fabricId) => ({
            fabric_id: fabricId,
            contacts: contactMap[fabricId] || [],
            normalized_count: (contactMap[fabricId] || []).filter((contact) => !!contact.normalized_e164).length,
            notifyable_count: (contactMap[fabricId] || []).filter((contact) => contact.can_notify_whatsapp).length,
          })),
        }), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
      }

      if (action === "signal_contacts_sync_waha") {
        const waha = await adminWahaHealth();
        if (!waha.ready) {
          return new Response(JSON.stringify({ ok: false, error: "waha_not_ready", waha }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        }
        const all = fabricIds.flatMap((fabricId) => contactMap[fabricId] || []).filter((contact) => !!contact.normalized_e164);
        const unique = Array.from(new Map(all.map((contact) => [contact.normalized_e164!, contact])).values()).slice(0, 80);
        const checks: any[] = [];
        for (let index = 0; index < unique.length; index += 6) {
          const batch = unique.slice(index, index + 6);
          checks.push(...await Promise.all(batch.map(async (contact) => {
            let contactId = contact.id as string | null;
            if (!contactId && contact.entity_id && contact.normalized_e164) {
              try {
                const valueHash = await hashPhone(contact.normalized_e164);
                const { data: existing } = await sb.from("waouh_entity_contacts")
                  .select("id")
                  .eq("entity_id", contact.entity_id)
                  .eq("channel", contact.channel === "whatsapp" ? "whatsapp" : "phone")
                  .eq("value_hash", valueHash)
                  .limit(1)
                  .maybeSingle();
                if (existing?.id) {
                  contactId = existing.id;
                } else {
                  const valueEncrypted = await encryptPhone(contact.normalized_e164);
                  const { data: inserted, error: insertError } = await sb.from("waouh_entity_contacts").insert({
                    entity_id: contact.entity_id,
                    channel: contact.channel === "whatsapp" ? "whatsapp" : "phone",
                    value_encrypted: valueEncrypted,
                    value_hash: valueHash,
                    value_last4: contact.value_last4 || phoneLast4(contact.normalized_e164),
                    public_value: null,
                    source_key: contact.source_key,
                    is_public_business: contact.is_public_business,
                    consent_state: contact.consent_state,
                    contactability_level: contact.contactability_level,
                    verification_status: "observed",
                    updated_at: new Date().toISOString(),
                  }).select("id").single();
                  if (insertError) throw insertError;
                  contactId = inserted?.id || null;
                }
              } catch (storeError) {
                console.warn("[waouh-admin-stats] contact graph persist:", storeError);
              }
            }

            const state = await adminWahaCheck(contact.normalized_e164!);
            if (contactId) {
              await sb.from("waouh_entity_contacts").update({
                is_whatsapp_reachable: state.reachable,
                verification_status: state.reachable === true ? "reachable" : state.reachable === false ? "unreachable" : "unknown",
                verified_at: state.reachable === null ? null : new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }).eq("id", contactId);
            }
            return {
              e164: contact.normalized_e164,
              reachable: state.reachable,
              chat_id: state.chatId,
              reason: state.reason,
              contact_id: contactId,
            };
          })));
        }
        await auditContactCenter(sb, user.id, "sync_whatsapp_contacts", {
          fabric_count: fabricIds.length,
          checked: checks.length,
          reachable: checks.filter((row) => row.reachable === true).length,
        });
        return new Response(JSON.stringify({
          ok: true,
          checked: checks.length,
          reachable: checks.filter((row) => row.reachable === true).length,
          unreachable: checks.filter((row) => row.reachable === false).length,
          truncated: unique.length < all.length,
          results: checks,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
      }

      const waha = await adminWahaHealth();
      if (!waha.ready) {
        return new Response(JSON.stringify({ ok: false, error: "waha_not_ready", waha }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      }
      const message = String(requestBody.message || "").trim();
      if (message.length < 2 || message.length > 1200) throw new Error("invalid_message");
      const queued: any[] = [];
      const skipped: any[] = [];
      const seen = new Set<string>();
      for (const fabricId of fabricIds.slice(0, 50)) {
        for (const contact of contactMap[fabricId] || []) {
          if (!contact.normalized_e164) continue;
          if (seen.has(contact.normalized_e164)) continue;
          seen.add(contact.normalized_e164);
          if (!contact.can_notify_whatsapp) {
            skipped.push({ fabric_id: fabricId, phone_last4: contact.value_last4, reason: contact.notify_reason });
            continue;
          }
          if (contact.is_whatsapp_reachable === false) {
            skipped.push({ fabric_id: fabricId, phone_last4: contact.value_last4, reason: "not_on_whatsapp" });
            continue;
          }
          const dedupeKey = `admin-signal:${user.id}:${fabricId}:${contact.value_last4 || "phone"}:${Date.now()}`;
          const { error: queueError } = await sb.rpc("waouh_enqueue_outbound_v2", {
            p_to_phone: providerPhone(contact.normalized_e164),
            p_to_user_id: null,
            p_template: "nexus_admin_notification",
            p_payload: {
              text: message,
              actions: [],
              fabric_id: fabricId,
              source_key: contact.source_key,
              contact_id: contact.id || null,
              initiated_by_admin: user.id,
            },
            p_web_session_id: null,
            p_image_url: null,
            p_channel: "whatsapp",
            p_dedupe_key: dedupeKey,
            p_event_type: "admin_signal_notification",
          });
          if (queueError) {
            skipped.push({ fabric_id: fabricId, phone_last4: contact.value_last4, reason: queueError.message });
          } else {
            queued.push({ fabric_id: fabricId, phone_last4: contact.value_last4, contact_id: contact.id || null });
          }
        }
      }
      if (queued.length) {
        fetch(`${SUPABASE_URL}/functions/v1/waouh-outbound-dispatch`, {
          method: "POST",
          headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 20, manual: true }),
        }).catch(() => {});
      }
      await auditContactCenter(sb, user.id, "queue_whatsapp_notifications", {
        fabric_count: fabricIds.length,
        queued: queued.length,
        skipped: skipped.length,
      });
      return new Response(JSON.stringify({
        ok: true,
        queued: queued.length,
        skipped: skipped.length,
        queue: queued,
        skipped_rows: skipped,
      }), {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    if (action === "contact_layer_get") {
      const [sources, contacts, fabric] = await Promise.all([
        sb.from("waouh_discovery_sources")
          .select("source_key,label,family,connector_mode,operational_state,supports_contact,default_contactability,trust_weight,updated_at")
          .order("label"),
        sb.from("waouh_entity_contacts").select("contactability_level,consent_state").limit(10000),
        sb.from("waouh_signal_fabric").select("contactability_level,source_key").limit(10000),
      ]);
      if (sources.error) throw sources.error;
      if (contacts.error) throw contacts.error;
      if (fabric.error) throw fabric.error;
      const byLevel = (rows: any[] | null) => {
        const out: Record<string, number> = { C0: 0, C1: 0, C2: 0, C3: 0, C4: 0, C5: 0 };
        for (const row of rows ?? []) {
          const key = String(row?.contactability_level ?? "C0");
          out[key] = (out[key] ?? 0) + 1;
        }
        return out;
      };
      const policy = [
        { level: "C0", label: "Découverte uniquement", can_reveal: false, can_auto_contact: false, requires_approval: false },
        { level: "C1", label: "Contact professionnel public", can_reveal: true, can_auto_contact: false, requires_approval: false },
        { level: "C2", label: "Conversation privée / blind matching", can_reveal: false, can_auto_contact: false, requires_approval: true },
        { level: "C3", label: "Opt-in commercial", can_reveal: true, can_auto_contact: true, requires_approval: true },
        { level: "C4", label: "Contact établi", can_reveal: true, can_auto_contact: true, requires_approval: false },
        { level: "C5", label: "Prêt à négocier", can_reveal: true, can_auto_contact: true, requires_approval: false },
      ];
      return new Response(JSON.stringify({
        ok: true,
        sources: sources.data ?? [],
        counts: { contacts: byLevel(contacts.data), fabric: byLevel(fabric.data) },
        policy,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }

    if (action === "contact_layer_update_source") {
      const sourceKey = String(requestBody.source_key ?? "");
      const level = String(requestBody.default_contactability ?? "");
      const trust = Number(requestBody.trust_weight);
      const allowedLevels = new Set(["C0", "C1", "C2", "C3", "C4", "C5"]);
      if (!allowedLevels.has(level)) throw new Error("Niveau de contactabilité invalide.");
      if (!Number.isFinite(trust) || trust < 0 || trust > 1) throw new Error("Le poids de confiance doit être compris entre 0 et 1.");
      const { data: source, error: sourceError } = await sb.from("waouh_discovery_sources")
        .select("*").eq("source_key", sourceKey).maybeSingle();
      if (sourceError) throw sourceError;
      if (!source) throw new Error("Source inconnue.");
      const permitted =
        level === "C5" ? (source.source_key === "partner" || source.family === "partner" || source.family === "internal") :
        level === "C4" ? (source.source_key === "partner" || source.family === "partner" || source.family === "internal") :
        level === "C3" ? (source.supports_contact === true && ["partner","telephony","messaging","internal"].includes(source.family)) :
        level === "C2" ? source.supports_contact === true :
        true;
      if (!permitted) throw new Error("Le niveau " + level + " n’est pas autorisé pour cette source.");
      const { data: updated, error: updateError } = await sb.from("waouh_discovery_sources")
        .update({ default_contactability: level, trust_weight: trust, updated_at: new Date().toISOString() })
        .eq("source_key", sourceKey)
        .select("source_key,label,family,connector_mode,operational_state,supports_contact,default_contactability,trust_weight,updated_at")
        .single();
      if (updateError) throw updateError;
      const audit = await sb.from("waouh_admin_control_audit").insert({
        module_key: "contact_layer",
        actor_id: user.id,
        action: "update_source_policy",
        before_state: { default_contactability: source.default_contactability, trust_weight: source.trust_weight },
        after_state: { default_contactability: level, trust_weight: trust },
      });
      if (audit.error) console.warn("[waouh-admin-stats] contact-layer audit:", audit.error.message);
      return new Response(JSON.stringify({ ok: true, data: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    const now = Date.now();
    const since24h = new Date(now - 24 * 3600_000).toISOString();
    const stale15m = new Date(now - 15 * 60_000).toISOString();
    const stale48h = new Date(now - 48 * 3600_000).toISOString();

    const [
      arts, txs, users,
      controls, controlAudit,
      messages24, threads,
      external24, fabricRows, nexusMatches24,
      negotiations, deals,
      queue24, queuePending, queueStale,
      traceErrors24,
      agentMissions, agentSteps, agentApprovals, agentOutbox,
      diffusionPending,
      connectors, radarSources, radarAuto,
      telSettings, whatsappAccounts,
    ] = await Promise.all([
      sb.from("waouh_articles").select("status,category,city,created_at"),
      sb.from("waouh_transactions").select("amount,commission,status,created_at"),
      sb.from("waouh_users").select("id"),

      sb.from("waouh_admin_module_controls").select("*").order("module_key"),
      sb.from("waouh_admin_control_audit").select("id,module_key,actor_id,action,before_state,after_state,created_at")
        .order("created_at", { ascending: false }).limit(30),

      sb.from("waouh_messages").select("id,channel,direction,meta,created_at")
        .gte("created_at", since24h).order("created_at", { ascending: false }).limit(10000),
      sb.from("waouh_chat_threads").select("id,thread_type,source,status,last_message_at,metadata")
        .order("last_message_at", { ascending: false }).limit(5000),

      sb.from("waouh_external_commerce_signals")
        .select("id,source_key,intent,has_whatsapp,primary_photo_url,created_at")
        .gte("created_at", since24h).limit(10000),
      sb.from("waouh_signal_fabric").select("fabric_id,source_key,contactability_level,intent").limit(10000),
      sb.from("waouh_nexus_matches").select("id,status,total_score,source,created_at")
        .gte("created_at", since24h).limit(10000),

      sb.from("waouh_negotiations").select("id,state,created_at,updated_at,thread_id").limit(10000),
      sb.from("waouh_deals").select("id,status,payment_status,commission_status,created_at,updated_at").limit(10000),

      sb.from("waouh_outbound_queue").select("id,status,channel,last_error,attempts,created_at,next_attempt_at")
        .gte("created_at", since24h).limit(10000),
      sb.from("waouh_outbound_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("waouh_outbound_queue").select("id", { count: "exact", head: true })
        .eq("status", "pending").lt("created_at", stale15m),

      sb.from("waouh_trace_events").select("id,stage,status,error,created_at")
        .gte("created_at", since24h).or("status.eq.error,error.not.is.null").limit(2000),

      sb.from("waouh_agent_missions").select("id,status,last_error,created_at,updated_at").limit(5000),
      sb.from("waouh_agent_steps").select("id,status,last_error,requires_approval,created_at,updated_at").limit(10000),
      sb.from("waouh_agent_approvals").select("id,status,action_type,created_at,expires_at").limit(5000),
      sb.from("waouh_agent_outbox").select("id,status,last_error,attempt_count,created_at,updated_at").limit(5000),

      sb.from("waouh_diffusion_approvals").select("id", { count: "exact", head: true }).eq("status", "pending"),

      sb.from("waouh_radar_api_configs")
        .select("provider,source_key,label,auth_mode,active,daily_quota,usage_today,last_test_at,last_test_status,last_test_message,last_sync_at,last_sync_status,last_sync_message,api_key"),
      sb.from("waouh_radar_sources").select("id,type,label,identifier,active,scan_freq_min,last_scan_at,last_signal_count")
        .order("created_at", { ascending: false }).limit(1000),
      sb.from("waouh_radar_auto_settings").select("*").eq("id", 1).maybeSingle(),

      sb.from("waouh_tel_settings").select("enabled,provider,sms_enabled,rcs_enabled,fallback_to_sms,virtual_groups_enabled,updated_at")
        .eq("key", "default").maybeSingle(),
      sb.from("whatsapp_accounts").select("id,session_name,status,last_activity,waha_authenticated,dashboard_authenticated,is_admin_shared")
        .order("last_activity", { ascending: false }).limit(100),
    ]);

    const required = [
      arts, txs, users, controls, controlAudit, messages24, threads, external24, fabricRows,
      nexusMatches24, negotiations, deals, queue24, agentMissions, agentSteps,
      agentApprovals, agentOutbox, connectors, radarSources, whatsappAccounts,
    ];
    for (const result of required) {
      if ((result as any).error) throw (result as any).error;
    }

    const articles = arts.data ?? [];
    const transactions = txs.data ?? [];
    const messages = messages24.data ?? [];
    const threadRows = threads.data ?? [];
    const externalSignals = external24.data ?? [];
    const fabric = fabricRows.data ?? [];
    const matchRows = nexusMatches24.data ?? [];
    const negotiationRows = negotiations.data ?? [];
    const dealRows = deals.data ?? [];
    const queueRows = queue24.data ?? [];
    const missionRows = agentMissions.data ?? [];
    const stepRows = agentSteps.data ?? [];
    const approvalRows = agentApprovals.data ?? [];
    const outboxRows = agentOutbox.data ?? [];
    const connectorRows = connectors.data ?? [];
    const sourceRows = radarSources.data ?? [];
    const waAccounts = whatsappAccounts.data ?? [];

    const total_articles = articles.length;
    const active_articles = articles.filter((a: any) => a.status === "active").length;
    const sold_articles = articles.filter((a: any) => a.status === "sold").length;
    const expired_articles = articles.filter((a: any) => a.status === "expired").length;
    const total_volume = transactions.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const total_commission = transactions.reduce((s: number, t: any) => s + Number(t.commission || 0), 0);

    const catMap: Record<string, number> = {};
    articles.forEach((a: any) => { catMap[a.category] = (catMap[a.category] || 0) + 1; });
    const top_categories = Object.entries(catMap).map(([category, count]) => ({ category, count }))
      .sort((a: any, b: any) => b.count - a.count).slice(0, 5);

    const cityMap: Record<string, number> = {};
    articles.forEach((a: any) => { if (a.city) cityMap[a.city] = (cityMap[a.city] || 0) + 1; });
    const city_density = Object.entries(cityMap).map(([city, count]) => ({ city, count }));

    const days: Record<string, { date: string; published: number; sold: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days[d] = { date: d.slice(5), published: 0, sold: 0 };
    }
    articles.forEach((a: any) => {
      const d = new Date(a.created_at).toISOString().slice(0, 10);
      if (days[d]) days[d].published++;
    });
    transactions.forEach((t: any) => {
      if (t.status === "completed") {
        const d = new Date(t.created_at).toISOString().slice(0, 10);
        if (days[d]) days[d].sold++;
      }
    });

    const messageByChannel = countBy(messages, "channel");
    const messageByDirection = countBy(messages, "direction");
    const activeThreads = threadRows.filter((row: any) => row.status !== "closed").length;
    const avatar24 = messages.filter(isAvatarMessage).length;
    const museSurface24 = messages.filter(isMuseMessage).length;

    const externalWithPhoto = externalSignals.filter((row: any) => !!row.primary_photo_url).length;
    const externalWithWhatsapp = externalSignals.filter((row: any) => row.has_whatsapp === true).length;

    const staleNegotiations = negotiationRows.filter((row: any) =>
      ["proposed", "countered"].includes(String(row.state)) &&
      new Date(row.updated_at || row.created_at).getTime() < new Date(stale48h).getTime()
    ).length;
    const negotiationByState = countBy(negotiationRows, "state");

    const activeDealStatuses = new Set(["pending", "pending_assignment", "assigned", "picked_up", "delivered", "payment_review", "cod_confirmed"]);
    const activeDeals = dealRows.filter((row: any) => activeDealStatuses.has(String(row.status))).length;
    const dealByStatus = countBy(dealRows, "status");
    const dealIssues = dealRows.filter((row: any) => ["disputed", "payment_review"].includes(String(row.status))).length;

    const queueByStatus24 = countBy(queueRows, "status");
    const queueFailed24 = queueRows.filter((row: any) => row.status === "failed").length;
    const queueSent24 = queueRows.filter((row: any) => row.status === "sent").length;

    const traceErrorRows = traceErrors24.data ?? [];
    const missionByStatus = countBy(missionRows, "status");
    const stepByStatus = countBy(stepRows, "status");
    const missionErrors = missionRows.filter((row: any) => !!row.last_error || row.status === "failed").length;
    const stepErrors = stepRows.filter((row: any) => !!row.last_error || row.status === "failed").length;
    const pendingAgentApprovals = approvalRows.filter((row: any) => row.status === "pending").length;
    const agentOutboxFailed = outboxRows.filter((row: any) => row.status === "failed" || !!row.last_error).length;

    const safeConnectors = connectorRows.map((row: any) => ({
      provider: row.provider,
      source_key: row.source_key,
      label: row.label,
      auth_mode: row.auth_mode,
      active: row.active,
      configured: !!String(row.api_key || "").trim() || ["native", "native_settings", "none", "share"].includes(String(row.auth_mode || "")),
      daily_quota: row.daily_quota,
      usage_today: row.usage_today,
      last_test_at: row.last_test_at,
      last_test_status: row.last_test_status,
      last_test_message: row.last_test_message,
      last_sync_at: row.last_sync_at,
      last_sync_status: row.last_sync_status,
      last_sync_message: row.last_sync_message,
    }));

    const connectorProblems = safeConnectors.filter((row: any) =>
      row.active && (!row.configured || row.last_test_status === "ko" || row.last_sync_status === "ko")
    );
    const connectorQuotaRisks = safeConnectors
      .filter((row: any) => row.active && Number(row.daily_quota || 0) > 0)
      .map((row: any) => ({
        ...row,
        quota_pct: Math.round((Number(row.usage_today || 0) / Math.max(1, Number(row.daily_quota || 1))) * 100),
      }))
      .filter((row: any) => row.quota_pct >= 80);
    const sourceNeverScanned = sourceRows.filter((row: any) => row.active && !row.last_scan_at).length;
    const sourceOverdue = sourceRows.filter((row: any) => {
      if (!row.active || !row.last_scan_at) return false;
      const intervalMs = Math.max(5, Number(row.scan_freq_min || 60)) * 60_000;
      const last = new Date(row.last_scan_at).getTime();
      return Number.isFinite(last) && now - last > intervalMs * 2;
    }).length;
    const activeWhatsAppAccounts = waAccounts.filter((row: any) =>
      ["WORKING", "connected"].includes(String(row.status)) || row.waha_authenticated === true
    ).length;

    const alerts: any[] = [];
    const addAlert = (severity: "critical"|"warning"|"info", code: string, title: string, detail: string, target?: string) =>
      alerts.push({ severity, code, title, detail, target: target ?? null });

    if (queueFailed24 > 0) addAlert("critical", "outbound_failed", "Échecs de sortie", `${queueFailed24} envoi(s) ont échoué sur les dernières 24 h.`, "/admin/waouh/historique");
    if ((queueStale.count ?? 0) > 0) addAlert("warning", "outbound_stale", "Queue en retard", `${queueStale.count ?? 0} élément(s) pending depuis plus de 15 min.`, "/admin/waouh/historique");
    if (traceErrorRows.length > 0) addAlert("critical", "trace_errors", "Erreurs de chaîne", `${traceErrorRows.length} trace(s) en erreur sur 24 h.`, "/admin/waouh/health-check");
    if (dealIssues > 0) addAlert("critical", "deal_issues", "Deals à arbitrer", `${dealIssues} deal(s) en litige ou revue paiement.`, "/admin/waouh/deals");
    if (staleNegotiations > 0) addAlert("warning", "stale_negotiations", "Négociations stagnantes", `${staleNegotiations} négociation(s) ouvertes depuis plus de 48 h.`, "/admin/waouh/historique");
    if (missionErrors + stepErrors + agentOutboxFailed > 0) addAlert("warning", "agent_errors", "Agents IA à contrôler", `${missionErrors} mission(s), ${stepErrors} étape(s), ${agentOutboxFailed} sortie(s) en anomalie.`, "/app/missions");
    if (pendingAgentApprovals > 0) addAlert("info", "agent_approvals", "Approbations Agents IA", `${pendingAgentApprovals} action(s) attendent une décision humaine.`, "/app/missions");
    if ((diffusionPending.count ?? 0) > 0) addAlert("info", "diffusion_approvals", "Diffusions à valider", `${diffusionPending.count ?? 0} campagne(s) en attente.`, "/admin/waouh/diffusion-approvals");
    if (connectorProblems.length > 0) addAlert("warning", "connector_problems", "Connecteurs NEXUS", `${connectorProblems.length} connecteur(s) actif(s) nécessitent une action.`, "/admin/waouh?tab=radar");
    if (connectorQuotaRisks.length > 0) {
      const maxRisk = Math.max(...connectorQuotaRisks.map((row: any) => Number(row.quota_pct || 0)));
      addAlert(maxRisk >= 95 ? "critical" : "warning", "connector_quota", "Quotas API NEXUS", `${connectorQuotaRisks.length} connecteur(s) ont consommé au moins 80 % de leur quota journalier.`, "/admin/waouh?tab=radar");
    }
    if (sourceNeverScanned > 0) addAlert("info", "sources_never_scanned", "Sources jamais collectées", `${sourceNeverScanned} source(s) actives n'ont encore jamais été scannées.`, "/admin/waouh?tab=radar");
    if (sourceOverdue > 0) addAlert("warning", "sources_overdue", "Collectes NEXUS en retard", `${sourceOverdue} source(s) dépassent deux fois leur fréquence de scan configurée.`, "/admin/waouh?tab=radar");
    const whatsappControl = (controls.data ?? []).find((row: any) => row.module_key === "chat_whatsapp");
    if (whatsappControl?.enabled && activeWhatsAppAccounts === 0) {
      addAlert("warning", "whatsapp_no_session", "WhatsApp sans session active", "Le module est activé mais aucune session WAHA opérationnelle n'est détectée.", "/admin/waouh/whatsapp-ops");
    }

    const criticalCount = alerts.filter((row) => row.severity === "critical").length;
    const warningCount = alerts.filter((row) => row.severity === "warning").length;
    const overallStatus = criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "healthy";

    return new Response(JSON.stringify({
      total_articles,
      active_articles,
      sold_articles,
      expired_articles,
      total_volume,
      total_commission,
      unique_users: (users.data ?? []).length,
      top_categories,
      city_density,
      growth_30d: Object.values(days),
      command_center: {
        generated_at: new Date().toISOString(),
        overall_status: overallStatus,
        alerts,
        modules: controls.data ?? [],
        recent_control_audit: controlAudit.data ?? [],
        chat: {
          messages_24h: messages.length,
          by_channel: messageByChannel,
          by_direction: messageByDirection,
          active_threads: activeThreads,
          avatar_messages_24h: avatar24,
          muse_messages_24h: museSurface24,
        },
        nexus: {
          signal_fabric_total: fabric.length,
          fabric_by_contactability: countBy(fabric, "contactability_level"),
          fabric_by_source: countBy(fabric, "source_key"),
          fabric_by_intent: countBy(fabric, "intent"),
          external_signals_24h: externalSignals.length,
          external_with_photo_24h: externalWithPhoto,
          external_with_whatsapp_24h: externalWithWhatsapp,
          matches_24h: matchRows.length,
          match_status_24h: countBy(matchRows, "status"),
          connectors: safeConnectors,
          connector_quota_risks: connectorQuotaRisks,
          sources_total: sourceRows.length,
          sources_active: sourceRows.filter((row: any) => row.active).length,
          sources_never_scanned: sourceNeverScanned,
          sources_overdue: sourceOverdue,
          radar_auto: radarAuto.data ?? null,
        },
        negotiation: {
          total: negotiationRows.length,
          by_state: negotiationByState,
          stale_48h: staleNegotiations,
        },
        deals: {
          total: dealRows.length,
          active: activeDeals,
          by_status: dealByStatus,
          issues: dealIssues,
        },
        outbound: {
          pending_total: queuePending.count ?? 0,
          pending_stale_15m: queueStale.count ?? 0,
          sent_24h: queueSent24,
          failed_24h: queueFailed24,
          by_status_24h: queueByStatus24,
        },
        agents: {
          missions_total: missionRows.length,
          missions_by_status: missionByStatus,
          mission_errors: missionErrors,
          steps_by_status: stepByStatus,
          step_errors: stepErrors,
          approvals_pending: pendingAgentApprovals,
          outbox_failed: agentOutboxFailed,
        },
        approvals: {
          diffusion_pending: diffusionPending.count ?? 0,
          agent_pending: pendingAgentApprovals,
        },
        integrations: {
          whatsapp_active_sessions: activeWhatsAppAccounts,
          whatsapp_accounts: waAccounts,
          native_messaging: telSettings.data ?? null,
        },
        traces: {
          errors_24h: traceErrorRows.length,
        },
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("[waouh-admin-stats]", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
