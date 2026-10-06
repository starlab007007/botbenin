import { createClient } from "npm:@supabase/supabase-js@2";
import { decryptPhone } from "../_shared/waouh-tel/crypto.ts";
import { normalizeE164, phoneLast4, providerPhone } from "../_shared/waouh-tel/phone.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const WAHA_BASE_URL = (Deno.env.get("WAHA_BASE_URL") || "").replace(/\/$/, "");
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY") || "";
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ContactRow = {
  id?: string | null;
  fabric_id: string;
  source_key: string;
  label?: string | null;
  channel: string;
  value: string;
  normalized_e164?: string | null;
  whatsapp_chat_id?: string | null;
  value_last4?: string | null;
  contactability_level: string;
  consent_state: string;
  is_public_business: boolean;
  is_whatsapp_reachable: boolean | null;
  can_notify_whatsapp: boolean;
  notify_reason: string;
  entity_id?: string | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function uniqStrings(values: unknown[], max = 300) {
  return Array.from(new Set(values.map(v => String(v ?? "").trim()).filter(Boolean))).slice(0, max);
}

function sourceAllowsDirectWhatsApp(source: any) {
  const key = String(source?.source_key || "");
  const family = String(source?.family || "");
  if (["waouh_app", "whatsapp", "partner", "status", "google_places", "facebook_business", "instagram_business", "benin_directory"].includes(key)) return true;
  return ["internal", "partner", "messaging"].includes(family);
}

function storedConsentAllows(contact: any) {
  return contact?.is_public_business === true ||
    ["public_business", "initiated", "opt_in", "partner_contract"].includes(String(contact?.consent_state || ""));
}

function normalizedCandidate(raw: unknown) {
  const e164 = normalizeE164(raw);
  if (!e164) return null;
  return {
    e164,
    chatId: `${providerPhone(e164)}@c.us`,
    last4: phoneLast4(e164),
  };
}

function phoneCandidates(e164: string) {
  const canonical = providerPhone(e164);
  const out = [canonical];
  if (canonical.startsWith("22901") && canonical.length === 13) {
    out.push(`229${canonical.slice(5)}`);
  } else if (canonical.startsWith("229") && canonical.length === 11) {
    out.push(`22901${canonical.slice(3)}`);
  }
  return Array.from(new Set(out));
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) throw Object.assign(new Error("authentication_required"), { status: 401 });
  if (auth.replace(/^Bearer\s+/i, "").trim() === SERVICE_ROLE) {
    return { id: null as string | null, service: true };
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw Object.assign(new Error("invalid_session"), { status: 401 });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const [admin, superAdmin] = await Promise.all([
    sb.rpc("has_role", { _user_id: user.id, _role_name: "admin" }),
    sb.rpc("has_role", { _user_id: user.id, _role_name: "super_admin" }),
  ]);
  if (admin.data !== true && superAdmin.data !== true) {
    throw Object.assign(new Error("admin_required"), { status: 403 });
  }
  return { id: user.id, service: false };
}

async function wahaCheck(e164: string) {
  if (!WAHA_BASE_URL) return { reachable: null as boolean | null, chatId: null as string | null, reason: "waha_not_configured" };
  const headers: Record<string, string> = { Accept: "application/json" };
  if (WAHA_API_KEY) headers["X-Api-Key"] = WAHA_API_KEY;
  for (const candidate of phoneCandidates(e164)) {
    const routes = [
      `/api/${encodeURIComponent(WAHA_SESSION)}/contacts/check-exists?phone=${encodeURIComponent(candidate)}`,
      `/api/contacts/check-exists?phone=${encodeURIComponent(candidate)}&session=${encodeURIComponent(WAHA_SESSION)}`,
    ];
    for (const route of routes) {
      try {
        const res = await fetch(`${WAHA_BASE_URL}${route}`, {
          headers,
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) continue;
        const body = await res.json().catch(() => null);
        if (body && (body.numberExists === true || body.exists === true)) {
          return { reachable: true, chatId: typeof body.chatId === "string" ? body.chatId : `${candidate}@c.us`, reason: null };
        }
        if (body && (body.numberExists === false || body.exists === false)) {
          continue;
        }
      } catch (_) {}
    }
  }
  return { reachable: false, chatId: null, reason: "not_on_whatsapp" };
}

async function resolveContacts(sb: any, fabricIds: string[]) {
  const { data: fabric, error: fabricError } = await sb
    .from("waouh_signal_fabric")
    .select("fabric_id,source_record_id,source_key,contactability_level,evidence")
    .in("fabric_id", fabricIds);
  if (fabricError) throw fabricError;

  const { data: registry, error: registryError } = await sb
    .from("waouh_discovery_sources")
    .select("source_key,family,supports_contact,default_contactability");
  if (registryError) throw registryError;
  const sourceMap = new Map((registry || []).map((row: any) => [String(row.source_key), row]));

  const articleIds = uniqStrings((fabric || []).map((r: any) => r.evidence?.article_id), 500);
  const buyerIds = uniqStrings((fabric || []).map((r: any) => r.evidence?.buyer_profile_id), 500);
  const catalogIds = uniqStrings((fabric || []).map((r: any) => r.evidence?.catalog_id), 500);
  const radarIds = uniqStrings((fabric || []).map((r: any) => r.evidence?.radar_signal_id), 500);
  const externalIds = uniqStrings((fabric || []).filter((r: any) => String(r.fabric_id).startsWith("external:")).map((r: any) => String(r.fabric_id).slice("external:".length)), 500);
  const directUserIds = uniqStrings((fabric || []).flatMap((r: any) => [r.evidence?.seller_id, r.evidence?.user_id]), 1000);

  const [articles, buyers, catalogs, radar, external] = await Promise.all([
    articleIds.length ? sb.from("waouh_articles").select("id,seller_id,contact_whatsapp,partner_id").in("id", articleIds) : Promise.resolve({ data: [], error: null }),
    buyerIds.length ? sb.from("waouh_buyer_profiles").select("id,user_id,contact_whatsapp").in("id", buyerIds) : Promise.resolve({ data: [], error: null }),
    catalogIds.length ? sb.from("waouh_unified_catalog").select("id,vendeur_nom,vendeur_phone,vendeur_whatsapp,partner_id,business_id,verified").in("id", catalogIds) : Promise.resolve({ data: [], error: null }),
    radarIds.length ? sb.from("waouh_radar_signals").select("id,contact_phone,contact_handle,waouh_user_id,source_type").in("id", radarIds) : Promise.resolve({ data: [], error: null }),
    externalIds.length ? sb.from("waouh_external_commerce_signals").select("id,entity_id,actor_name,contact_consent_basis,source_key").in("id", externalIds) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const q of [articles, buyers, catalogs, radar, external]) if (q.error) throw q.error;

  const articleMap = new Map((articles.data || []).map((r: any) => [String(r.id), r]));
  const buyerMap = new Map((buyers.data || []).map((r: any) => [String(r.id), r]));
  const catalogMap = new Map((catalogs.data || []).map((r: any) => [String(r.id), r]));
  const radarMap = new Map((radar.data || []).map((r: any) => [String(r.id), r]));
  const externalMap = new Map((external.data || []).map((r: any) => [String(r.id), r]));

  const userIds = new Set(directUserIds);
  for (const a of articles.data || []) if (a.seller_id) userIds.add(String(a.seller_id));
  for (const b of buyers.data || []) if (b.user_id) userIds.add(String(b.user_id));
  for (const r of radar.data || []) if (r.waouh_user_id) userIds.add(String(r.waouh_user_id));

  const users = userIds.size
    ? await sb.from("waouh_users").select("id,phone_number,display_name,auth_user_id").in("id", Array.from(userIds))
    : { data: [], error: null };
  if (users.error) throw users.error;
  const userMap = new Map((users.data || []).map((r: any) => [String(r.id), r]));

  const entityIds = uniqStrings((external.data || []).map((r: any) => r.entity_id), 500);
  const entityContacts = entityIds.length
    ? await sb.from("waouh_entity_contacts")
      .select("id,entity_id,channel,value_encrypted,public_value,value_last4,source_key,is_public_business,consent_state,contactability_level,is_whatsapp_reachable,verification_status")
      .in("entity_id", entityIds)
    : { data: [], error: null };
  if (entityContacts.error) throw entityContacts.error;
  const contactsByEntity = new Map<string, any[]>();
  for (const c of entityContacts.data || []) {
    const key = String(c.entity_id);
    contactsByEntity.set(key, [...(contactsByEntity.get(key) || []), c]);
  }

  const result: Record<string, ContactRow[]> = {};
  const add = (fabricRow: any, raw: unknown, meta: Partial<ContactRow> & { label?: string | null }) => {
    const text = String(raw ?? "").trim();
    if (!text) return;
    const norm = ["phone", "whatsapp"].includes(String(meta.channel || "")) ? normalizedCandidate(text) : null;
    const source = sourceMap.get(String(fabricRow.source_key)) || {};
    const level = String(meta.contactability_level || fabricRow.contactability_level || source.default_contactability || "C0");
    const directSource = sourceAllowsDirectWhatsApp({ ...source, source_key: fabricRow.source_key });
    const consent = String(meta.consent_state || "unknown");
    const publicBusiness = meta.is_public_business === true;
    const allowedByConsent = publicBusiness || ["public_business", "initiated", "opt_in", "partner_contract"].includes(consent);
    const canNotify = !!norm && (allowedByConsent || directSource) && !["C0"].includes(level);
    const reason = !norm
      ? "contact_non_telephonique"
      : canNotify
        ? (allowedByConsent ? "autorise_par_consentement_ou_contact_public" : "canal_waouh_ou_partenaire")
        : "notification_whatsapp_non_autorisee";
    const item: ContactRow = {
      id: meta.id ?? null,
      fabric_id: String(fabricRow.fabric_id),
      source_key: String(fabricRow.source_key),
      label: meta.label ?? null,
      channel: String(meta.channel || (norm ? "phone" : "other")),
      value: norm?.e164 || text,
      normalized_e164: norm?.e164 || null,
      whatsapp_chat_id: norm?.chatId || null,
      value_last4: norm?.last4 || meta.value_last4 || null,
      contactability_level: level,
      consent_state: consent,
      is_public_business: publicBusiness,
      is_whatsapp_reachable: meta.is_whatsapp_reachable ?? null,
      can_notify_whatsapp: canNotify,
      notify_reason: reason,
      entity_id: meta.entity_id ?? null,
    };
    const key = item.normalized_e164 ? `phone:${item.normalized_e164}` : `${item.channel}:${item.value}`;
    const current = result[item.fabric_id] || [];
    if (!current.some(c => (c.normalized_e164 ? `phone:${c.normalized_e164}` : `${c.channel}:${c.value}`) === key)) {
      current.push(item);
      result[item.fabric_id] = current;
    }
  };

  for (const row of fabric || []) {
    result[String(row.fabric_id)] = result[String(row.fabric_id)] || [];
    const evidence = row.evidence || {};
    const article = evidence.article_id ? articleMap.get(String(evidence.article_id)) : null;
    const buyer = evidence.buyer_profile_id ? buyerMap.get(String(evidence.buyer_profile_id)) : null;
    const catalog = evidence.catalog_id ? catalogMap.get(String(evidence.catalog_id)) : null;
    const radarRow = evidence.radar_signal_id ? radarMap.get(String(evidence.radar_signal_id)) : null;
    const source = sourceMap.get(String(row.source_key)) || {};

    const addUser = (id: unknown, label?: string) => {
      const user = id ? userMap.get(String(id)) : null;
      if (!user?.phone_number) return;
      add(row, user.phone_number, {
        channel: "whatsapp",
        label: label || user.display_name || "Compte WAOUH",
        contactability_level: row.contactability_level || "C2",
        consent_state: "initiated",
        is_public_business: false,
      });
    };

    if (article) {
      if (article.contact_whatsapp) add(row, article.contact_whatsapp, {
        channel: "whatsapp",
        label: "WhatsApp annonce",
        contactability_level: article.partner_id ? "C4" : (row.contactability_level || "C2"),
        consent_state: article.partner_id ? "partner_contract" : "initiated",
        is_public_business: !!article.partner_id,
      });
      addUser(article.seller_id, "Vendeur WAOUH");
    }
    if (buyer) {
      if (buyer.contact_whatsapp) add(row, buyer.contact_whatsapp, {
        channel: "whatsapp",
        label: "WhatsApp acheteur",
        contactability_level: row.contactability_level || "C2",
        consent_state: "initiated",
        is_public_business: false,
      });
      addUser(buyer.user_id, "Acheteur WAOUH");
    }
    if (catalog) {
      if (catalog.vendeur_whatsapp) add(row, catalog.vendeur_whatsapp, {
        channel: "whatsapp",
        label: catalog.vendeur_nom || "WhatsApp catalogue",
        contactability_level: catalog.partner_id ? "C4" : (row.contactability_level || source.default_contactability || "C1"),
        consent_state: catalog.partner_id ? "partner_contract" : (catalog.verified ? "public_business" : "unknown"),
        is_public_business: !!catalog.partner_id || catalog.verified === true,
      });
      if (catalog.vendeur_phone) add(row, catalog.vendeur_phone, {
        channel: "phone",
        label: catalog.vendeur_nom || "Téléphone catalogue",
        contactability_level: catalog.partner_id ? "C4" : (row.contactability_level || source.default_contactability || "C1"),
        consent_state: catalog.partner_id ? "partner_contract" : (catalog.verified ? "public_business" : "unknown"),
        is_public_business: !!catalog.partner_id || catalog.verified === true,
      });
    }
    if (radarRow?.contact_phone) add(row, radarRow.contact_phone, {
      channel: "phone",
      label: "Contact Radar",
      contactability_level: row.contactability_level || source.default_contactability || "C0",
      consent_state: sourceAllowsDirectWhatsApp({ ...source, source_key: row.source_key }) ? "public_business" : "unknown",
      is_public_business: ["google_places", "facebook_business", "instagram_business", "benin_directory"].includes(String(row.source_key)),
    });
    if (radarRow?.waouh_user_id) addUser(radarRow.waouh_user_id, "Contact WAOUH Radar");

    addUser(evidence.seller_id, "Vendeur WAOUH");
    addUser(evidence.user_id, "Utilisateur WAOUH");

    if (String(row.fabric_id).startsWith("external:")) {
      const ext = externalMap.get(String(row.fabric_id).slice("external:".length));
      if (ext?.entity_id) {
        for (const stored of contactsByEntity.get(String(ext.entity_id)) || []) {
          let value = String(stored.public_value || "").trim();
          if (!value && stored.value_encrypted) {
            try { value = await decryptPhone(stored.value_encrypted); } catch (_) { value = ""; }
          }
          if (!value) continue;
          add(row, value, {
            id: stored.id,
            entity_id: stored.entity_id,
            channel: stored.channel,
            label: ext.actor_name || "Contact NEXUS",
            value_last4: stored.value_last4,
            contactability_level: stored.contactability_level,
            consent_state: stored.consent_state,
            is_public_business: stored.is_public_business === true,
            is_whatsapp_reachable: stored.is_whatsapp_reachable,
          });
        }
      }
    }

    const hints = Array.isArray(evidence.contact_hints) ? evidence.contact_hints : [];
    for (const hint of hints.slice(0, 10)) {
      const text = typeof hint === "string" ? hint : String(hint?.value || hint?.phone || hint?.whatsapp || "");
      if (!text) continue;
      add(row, text, {
        channel: "phone",
        label: "Contact public détecté",
        contactability_level: row.contactability_level || source.default_contactability || "C0",
        consent_state: sourceAllowsDirectWhatsApp({ ...source, source_key: row.source_key }) ? "public_business" : "unknown",
        is_public_business: ["google_places", "facebook_business", "instagram_business", "benin_directory"].includes(String(row.source_key)),
      });
    }
  }
  return result;
}

async function audit(sb: any, actorId: string | null, action: string, afterState: any) {
  try {
    await sb.from("waouh_admin_control_audit").insert({
      module_key: "signal_fabric_contact_center",
      actor_id: actorId,
      action,
      before_state: {},
      after_state: afterState,
    });
  } catch (_) {}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  try {
    const admin = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "resolve");
    const fabricIds = uniqStrings(Array.isArray(body?.fabric_ids) ? body.fabric_ids : [body?.fabric_id], 300);
    if (!fabricIds.length) return json({ ok: false, error: "fabric_id_required" }, 422);

    const contactMap = await resolveContacts(sb, fabricIds);

    if (action === "resolve") {
      return json({
        ok: true,
        rows: fabricIds.map(fabricId => ({
          fabric_id: fabricId,
          contacts: contactMap[fabricId] || [],
          normalized_count: (contactMap[fabricId] || []).filter(c => !!c.normalized_e164).length,
          notifyable_count: (contactMap[fabricId] || []).filter(c => c.can_notify_whatsapp).length,
        })),
      });
    }

    if (action === "sync") {
      const all = fabricIds.flatMap(id => contactMap[id] || []).filter(c => c.normalized_e164);
      const unique = Array.from(new Map(all.map(c => [c.normalized_e164!, c])).values()).slice(0, 80);
      const checks: any[] = [];
      for (let i = 0; i < unique.length; i += 6) {
        const batch = unique.slice(i, i + 6);
        checks.push(...await Promise.all(batch.map(async contact => {
          const state = await wahaCheck(contact.normalized_e164!);
          if (contact.id) {
            await sb.from("waouh_entity_contacts").update({
              is_whatsapp_reachable: state.reachable,
              verification_status: state.reachable === true ? "reachable" : state.reachable === false ? "unreachable" : "unknown",
              verified_at: state.reachable === null ? null : new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", contact.id);
          }
          return {
            e164: contact.normalized_e164,
            reachable: state.reachable,
            chat_id: state.chatId,
            reason: state.reason,
          };
        })));
      }
      await audit(sb, admin.id, "sync_whatsapp_contacts", {
        fabric_count: fabricIds.length,
        checked: checks.length,
        reachable: checks.filter(x => x.reachable === true).length,
      });
      return json({
        ok: true,
        checked: checks.length,
        reachable: checks.filter(x => x.reachable === true).length,
        unreachable: checks.filter(x => x.reachable === false).length,
        truncated: unique.length < all.length,
        results: checks,
      });
    }

    if (action === "notify") {
      const message = String(body?.message || "").trim();
      if (message.length < 2 || message.length > 1200) return json({ ok: false, error: "invalid_message" }, 422);
      const requestedFabricIds = fabricIds.slice(0, 50);
      const queued: any[] = [];
      const skipped: any[] = [];
      const seen = new Set<string>();
      for (const fabricId of requestedFabricIds) {
        for (const contact of contactMap[fabricId] || []) {
          if (!contact.normalized_e164) continue;
          const key = contact.normalized_e164;
          if (seen.has(key)) continue;
          seen.add(key);
          if (!contact.can_notify_whatsapp) {
            skipped.push({ fabric_id: fabricId, phone_last4: contact.value_last4, reason: contact.notify_reason });
            continue;
          }
          if (contact.is_whatsapp_reachable === false) {
            skipped.push({ fabric_id: fabricId, phone_last4: contact.value_last4, reason: "not_on_whatsapp" });
            continue;
          }
          const dedupe = `admin-signal:${admin.id || "service"}:${fabricId}:${contact.value_last4 || "phone"}:${Date.now()}`;
          const { error } = await sb.rpc("waouh_enqueue_outbound_v2", {
            p_to_phone: providerPhone(contact.normalized_e164),
            p_to_user_id: null,
            p_template: "nexus_admin_notification",
            p_payload: {
              text: message,
              actions: [],
              fabric_id: fabricId,
              source_key: contact.source_key,
              contact_id: contact.id || null,
              initiated_by_admin: admin.id,
            },
            p_web_session_id: null,
            p_image_url: null,
            p_channel: "whatsapp",
            p_dedupe_key: dedupe,
            p_event_type: "admin_signal_notification",
          });
          if (error) {
            skipped.push({ fabric_id: fabricId, phone_last4: contact.value_last4, reason: error.message });
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
      await audit(sb, admin.id, "queue_whatsapp_notifications", {
        fabric_count: requestedFabricIds.length,
        queued: queued.length,
        skipped: skipped.length,
      });
      return json({ ok: true, queued: queued.length, skipped: skipped.length, queue: queued, skipped_rows: skipped }, 202);
    }

    return json({ ok: false, error: "unknown_action" }, 400);
  } catch (error: any) {
    console.error("[waouh-admin-contact-center]", error);
    return json({ ok: false, error: String(error?.message || error) }, Number(error?.status || 500));
  }
});
