import { createClient } from "npm:@supabase/supabase-js@2";
import { decryptPhone, encryptPhone, hashPhone, sha256Hex } from "../_shared/waouh-tel/crypto.ts";
import { formatPhoneDisplay, normalizeE164, phoneLast4, providerPhone } from "../_shared/waouh-tel/phone.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AnyRow = Record<string, any>;

type ContactCandidate = {
  channel: string;
  value: string;
  normalized: string | null;
  display: string;
  whatsapp_candidate: boolean;
  whatsapp_reachable: boolean | null;
  whatsapp_chat_id: string | null;
  send_allowed: boolean;
  source: string;
  origin_kind: string;
  origin_id: string | null;
  contact_id: string | null;
  entity_id: string | null;
  consent_state: string | null;
  contactability_level: string;
  verification_status: string | null;
  public_business: boolean;
  opted_out: boolean;
  last_verified_at: string | null;
  label: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((v): v is string => !!v))];
}

function asUuid(value: unknown): string | null {
  const v = String(value ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
    ? v
    : null;
}

function prefixedUuid(value: unknown, prefix: string): string | null {
  const v = String(value ?? "");
  if (!v.startsWith(prefix)) return null;
  return asUuid(v.slice(prefix.length));
}

function contactLevelAllowed(level: unknown) {
  return ["C1", "C2", "C3", "C4", "C5"].includes(String(level ?? "").toUpperCase());
}

function consentRevoked(value: unknown) {
  return ["revoked", "blocked", "opted_out", "denied"].includes(String(value ?? "").toLowerCase());
}

function phoneCandidates(e164: string) {
  const digits = providerPhone(e164);
  const out = [digits];
  if (digits.startsWith("229")) {
    const local = digits.slice(3);
    if (local.length === 10 && local.startsWith("01")) out.push(`229${local.slice(2)}`);
    else if (local.length === 8) out.push(`22901${local}`);
  }
  return [...new Set(out)];
}

function extractPhoneLike(text: unknown) {
  const raw = String(text ?? "");
  const out = new Set<string>();
  const re = /(?:\+|00)?\d[\d\s().-]{6,20}\d/g;
  for (const hit of raw.match(re) ?? []) {
    const e164 = normalizeE164(hit, "+229");
    if (e164) out.add(e164);
  }
  return [...out].slice(0, 4);
}

async function requireAdmin(req: Request, service: any) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return { ok: false as const, status: 401, error: "auth_required" };
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return { ok: false as const, status: 401, error: "auth_required" };

  const [admin, superAdmin] = await Promise.all([
    service.rpc("has_role", { _user_id: user.id, _role_name: "admin" }),
    service.rpc("has_role", { _user_id: user.id, _role_name: "super_admin" }),
  ]);
  if (admin.error || superAdmin.error) return { ok: false as const, status: 500, error: "role_check_failed" };
  if (admin.data !== true && superAdmin.data !== true) {
    return { ok: false as const, status: 403, error: "admin_required" };
  }
  return { ok: true as const, user };
}

async function safeDecrypt(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    return await decryptPhone(raw);
  } catch {
    return null;
  }
}

function indexBy<T extends AnyRow>(rows: T[] | null | undefined, key: string) {
  const map = new Map<string, T>();
  for (const row of rows ?? []) {
    const value = row?.[key];
    if (value != null) map.set(String(value), row);
  }
  return map;
}

function groupBy<T extends AnyRow>(rows: T[] | null | undefined, key: string) {
  const map = new Map<string, T[]>();
  for (const row of rows ?? []) {
    const value = row?.[key];
    if (value == null) continue;
    const k = String(value);
    const list = map.get(k) ?? [];
    list.push(row);
    map.set(k, list);
  }
  return map;
}

function addCandidate(target: Map<string, ContactCandidate>, candidate: Partial<ContactCandidate> & { channel: string; value: string }) {
  const value = String(candidate.value ?? "").trim();
  if (!value) return;

  const isPhone = ["phone", "whatsapp"].includes(candidate.channel);
  const normalized = isPhone ? normalizeE164(value, "+229") : null;
  const key = isPhone && normalized
    ? `phone:${normalized}`
    : `${candidate.channel}:${value.toLowerCase()}`;

  const level = String(candidate.contactability_level ?? "C0").toUpperCase();
  const consent = String(candidate.consent_state ?? "").toLowerCase();
  const revoked = consentRevoked(consent) || candidate.verification_status === "revoked" || candidate.opted_out === true;
  const consentAllowsSend =
    ["public_business", "initiated", "opt_in", "partner_contract"].includes(consent) ||
    ["C3", "C4", "C5"].includes(level);
  const existing = target.get(key);

  const next: ContactCandidate = {
    channel: candidate.channel,
    value,
    normalized,
    display: normalized ? formatPhoneDisplay(normalized) : value,
    whatsapp_candidate: !!normalized,
    whatsapp_reachable: candidate.whatsapp_reachable ?? null,
    whatsapp_chat_id: candidate.whatsapp_chat_id ?? null,
    send_allowed: !!normalized && contactLevelAllowed(level) && consentAllowsSend && !revoked,
    source: String(candidate.source ?? "unknown"),
    origin_kind: String(candidate.origin_kind ?? "unknown"),
    origin_id: candidate.origin_id ?? null,
    contact_id: candidate.contact_id ?? null,
    entity_id: candidate.entity_id ?? null,
    consent_state: candidate.consent_state ?? null,
    contactability_level: level,
    verification_status: candidate.verification_status ?? null,
    public_business: candidate.public_business === true,
    opted_out: candidate.opted_out === true,
    last_verified_at: candidate.last_verified_at ?? null,
    label: candidate.label ?? null,
  };

  if (!existing) {
    target.set(key, next);
    return;
  }

  // Merge duplicate representations of the same phone across sources, keeping
  // the most actionable/verified information.
  target.set(key, {
    ...existing,
    channel: existing.channel === "whatsapp" || next.channel !== "whatsapp" ? existing.channel : "whatsapp",
    whatsapp_reachable: existing.whatsapp_reachable === true || next.whatsapp_reachable === true
      ? true
      : (existing.whatsapp_reachable === false && next.whatsapp_reachable === false ? false : null),
    whatsapp_chat_id: existing.whatsapp_chat_id || next.whatsapp_chat_id,
    send_allowed: existing.send_allowed || next.send_allowed,
    contact_id: existing.contact_id || next.contact_id,
    entity_id: existing.entity_id || next.entity_id,
    consent_state: existing.consent_state || next.consent_state,
    contactability_level: contactLevelAllowed(existing.contactability_level)
      ? existing.contactability_level
      : next.contactability_level,
    verification_status: existing.verification_status || next.verification_status,
    public_business: existing.public_business || next.public_business,
    opted_out: existing.opted_out || next.opted_out,
    last_verified_at: existing.last_verified_at || next.last_verified_at,
    label: existing.label || next.label,
    source: existing.source === next.source ? existing.source : `${existing.source}, ${next.source}`,
  });
}

async function enrichFabricRows(service: any, rows: AnyRow[]) {
  if (!rows.length) return [];

  const externalIds = uniq(rows.map((r) => prefixedUuid(r.fabric_id, "external:")));
  const catalogIds = uniq(rows.flatMap((r) => [
    asUuid(r.evidence?.catalog_id),
    prefixedUuid(r.fabric_id, "catalog:"),
  ]));
  const articleIds = uniq(rows.flatMap((r) => [
    asUuid(r.evidence?.article_id),
    prefixedUuid(r.fabric_id, "article:"),
  ]));
  const directUserIds = uniq(rows.flatMap((r) => [
    asUuid(r.evidence?.user_id),
    asUuid(r.evidence?.seller_id),
  ]));
  const directBusinessIds = uniq(rows.map((r) => asUuid(r.evidence?.business_id)));
  const directRadarIds = uniq(rows.map((r) => asUuid(r.evidence?.radar_signal_id)));

  const [externalRes, catalogRes, articleRes] = await Promise.all([
    externalIds.length
      ? service.from("waouh_external_commerce_signals")
        .select("id,entity_id,actor_name,contact_consent_basis,contact_summary,source_key")
        .in("id", externalIds)
      : Promise.resolve({ data: [], error: null }),
    catalogIds.length
      ? service.from("waouh_unified_catalog")
        .select("id,vendeur_nom,vendeur_phone,vendeur_whatsapp,business_id,partner_id")
        .in("id", catalogIds)
      : Promise.resolve({ data: [], error: null }),
    articleIds.length
      ? service.from("waouh_articles")
        .select("id,title,seller_id,contact_whatsapp,origin_signal_id")
        .in("id", articleIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (externalRes.error) throw externalRes.error;
  if (catalogRes.error) throw catalogRes.error;
  if (articleRes.error) throw articleRes.error;

  const externalMap = indexBy(externalRes.data, "id");
  const catalogMap = indexBy(catalogRes.data, "id");
  const articleMap = indexBy(articleRes.data, "id");

  const entityIds = uniq((externalRes.data ?? []).map((r: AnyRow) => asUuid(r.entity_id)));
  const businessIds = uniq([
    ...directBusinessIds,
    ...(catalogRes.data ?? []).map((r: AnyRow) => asUuid(r.business_id)),
  ]);
  const userIds = uniq([
    ...directUserIds,
    ...(articleRes.data ?? []).map((r: AnyRow) => asUuid(r.seller_id)),
  ]);
  const radarIds = uniq([
    ...directRadarIds,
    ...(articleRes.data ?? []).map((r: AnyRow) => asUuid(r.origin_signal_id)),
  ]);

  const [contactsRes, businessRes, userRes, radarRes] = await Promise.all([
    entityIds.length
      ? service.from("waouh_entity_contacts")
        .select("id,entity_id,channel,value_encrypted,public_value,value_last4,source_key,is_public_business,consent_state,contactability_level,verified_at,verification_status,is_whatsapp_reachable,last_success_at,last_failure_at,sent_count,reply_count,failure_count")
        .in("entity_id", entityIds)
      : Promise.resolve({ data: [], error: null }),
    businessIds.length
      ? service.from("waouh_partner_businesses")
        .select("id,nom_entreprise,telephone,whatsapp,email,site_web,gerant_nom")
        .in("id", businessIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? service.from("waouh_users")
        .select("id,display_name,phone_number")
        .in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    radarIds.length
      ? service.from("waouh_radar_signals")
        .select("id,contact_phone,contact_handle,source_type")
        .in("id", radarIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const res of [contactsRes, businessRes, userRes, radarRes]) if (res.error) throw res.error;

  const contactsByEntity = groupBy(contactsRes.data, "entity_id");
  const businessMap = indexBy(businessRes.data, "id");
  const userMap = indexBy(userRes.data, "id");
  const radarMap = indexBy(radarRes.data, "id");

  const decryptedByContact = new Map<string, string | null>();
  await Promise.all((contactsRes.data ?? []).map(async (c: AnyRow) => {
    const clear = c.public_value || await safeDecrypt(c.value_encrypted);
    decryptedByContact.set(String(c.id), clear ? String(clear) : null);
  }));

  return rows.map((row) => {
    const contacts = new Map<string, ContactCandidate>();
    const evidence = row.evidence || {};
    const rowLevel = String(row.contactability_level || "C0").toUpperCase();

    const externalId = prefixedUuid(row.fabric_id, "external:");
    const external = externalId ? externalMap.get(externalId) : null;
    const resolvedEntityId = asUuid(external?.entity_id) || asUuid(evidence.entity_id);
    if (external?.entity_id) {
      for (const c of contactsByEntity.get(String(external.entity_id)) ?? []) {
        const clear = decryptedByContact.get(String(c.id));
        if (!clear) continue;
        addCandidate(contacts, {
          channel: String(c.channel || "phone"),
          value: clear,
          source: c.source_key || row.source_key,
          origin_kind: "entity_contact",
          origin_id: c.id,
          contact_id: c.id,
          entity_id: c.entity_id,
          consent_state: c.consent_state,
          contactability_level: c.contactability_level || rowLevel,
          verification_status: c.verification_status,
          whatsapp_reachable: c.is_whatsapp_reachable,
          public_business: c.is_public_business,
          last_verified_at: c.verified_at,
          label: external.actor_name || null,
        });
      }
    }

    const catalogId = asUuid(evidence.catalog_id) || prefixedUuid(row.fabric_id, "catalog:");
    const catalog = catalogId ? catalogMap.get(catalogId) : null;
    if (catalog) {
      if (catalog.vendeur_whatsapp) addCandidate(contacts, {
        channel: "whatsapp", value: catalog.vendeur_whatsapp, source: row.source_key,
        origin_kind: "catalog", origin_id: catalog.id, contactability_level: rowLevel,
        verification_status: "observed", consent_state: "initiated", label: catalog.vendeur_nom,
      });
      if (catalog.vendeur_phone) addCandidate(contacts, {
        channel: "phone", value: catalog.vendeur_phone, source: row.source_key,
        origin_kind: "catalog", origin_id: catalog.id, contactability_level: rowLevel,
        verification_status: "observed", label: catalog.vendeur_nom,
      });
    }

    const articleId = asUuid(evidence.article_id) || prefixedUuid(row.fabric_id, "article:");
    const article = articleId ? articleMap.get(articleId) : null;
    if (article?.contact_whatsapp) addCandidate(contacts, {
      channel: "whatsapp", value: article.contact_whatsapp, source: row.source_key,
      origin_kind: "article", origin_id: article.id, contactability_level: rowLevel,
      verification_status: "observed", consent_state: "initiated", label: article.title,
    });

    const userId = asUuid(evidence.user_id) || asUuid(evidence.seller_id) || asUuid(article?.seller_id);
    const user = userId ? userMap.get(userId) : null;
    if (user?.phone_number) addCandidate(contacts, {
      channel: "whatsapp", value: user.phone_number, source: row.source_key,
      origin_kind: "waouh_user", origin_id: user.id, contactability_level: rowLevel,
      verification_status: "observed", consent_state: "initiated", label: user.display_name,
    });

    const businessId = asUuid(evidence.business_id) || asUuid(catalog?.business_id);
    const business = businessId ? businessMap.get(businessId) : null;
    if (business) {
      if (business.whatsapp) addCandidate(contacts, {
        channel: "whatsapp", value: business.whatsapp, source: row.source_key,
        origin_kind: "partner_business", origin_id: business.id, contactability_level: rowLevel,
        verification_status: "observed", consent_state: "partner_contract", public_business: true,
        label: business.nom_entreprise || business.gerant_nom,
      });
      if (business.telephone) addCandidate(contacts, {
        channel: "phone", value: business.telephone, source: row.source_key,
        origin_kind: "partner_business", origin_id: business.id, contactability_level: rowLevel,
        verification_status: "observed", consent_state: "partner_contract", public_business: true,
        label: business.nom_entreprise || business.gerant_nom,
      });
      if (business.email) addCandidate(contacts, {
        channel: "email", value: business.email, source: row.source_key,
        origin_kind: "partner_business", origin_id: business.id, contactability_level: rowLevel,
        verification_status: "observed", consent_state: "partner_contract", public_business: true,
        label: business.nom_entreprise || business.gerant_nom,
      });
      if (business.site_web) addCandidate(contacts, {
        channel: "website", value: business.site_web, source: row.source_key,
        origin_kind: "partner_business", origin_id: business.id, contactability_level: rowLevel,
        verification_status: "observed", consent_state: "public_business", public_business: true,
        label: business.nom_entreprise || business.gerant_nom,
      });
    }

    const radarId = asUuid(evidence.radar_signal_id) || asUuid(article?.origin_signal_id);
    const radar = radarId ? radarMap.get(radarId) : null;
    if (radar?.contact_phone) addCandidate(contacts, {
      channel: "phone", value: radar.contact_phone, source: row.source_key,
      origin_kind: "radar_signal", origin_id: radar.id, contactability_level: rowLevel,
      verification_status: "observed", label: radar.contact_handle,
    });
    if (radar?.contact_handle) addCandidate(contacts, {
      channel: "social", value: radar.contact_handle, source: row.source_key,
      origin_kind: "radar_signal", origin_id: radar.id, contactability_level: rowLevel,
      verification_status: "observed", label: radar.source_type || "Réseau social",
    });

    const evidenceContacts: Array<[string, string]> = [
      ["whatsapp", "whatsapp"],
      ["phone", "phone"],
      ["contact_phone", "phone"],
      ["vendeur_whatsapp", "whatsapp"],
      ["vendeur_phone", "phone"],
      ["email", "email"],
      ["contact_email", "email"],
      ["website", "website"],
      ["site_web", "website"],
      ["contact_handle", "social"],
      ["handle", "social"],
      ["username", "social"],
    ];
    for (const [key, channel] of evidenceContacts) {
      if (evidence?.[key]) addCandidate(contacts, {
        channel,
        value: String(evidence[key]),
        source: row.source_key,
        origin_kind: "evidence",
        origin_id: row.source_record_id || null,
        contactability_level: rowLevel,
        verification_status: "observed",
      });
    }

    // Admin-only heuristic fallback for public/raw source text. It never changes
    // contactability or consent; C0 stays non-sendable until another source
    // establishes an actionable contact level.
    for (const e164 of extractPhoneLike(row.raw_text)) addCandidate(contacts, {
      channel: "phone", value: e164, source: row.source_key,
      origin_kind: "raw_text", origin_id: row.source_record_id || null,
      contactability_level: rowLevel, verification_status: "unknown",
    });

    const list = [...contacts.values()].sort((a, b) => {
      const score = (c: ContactCandidate) =>
        (c.channel === "whatsapp" ? 20 : c.channel === "phone" ? 10 : 0) +
        (c.whatsapp_reachable === true ? 8 : 0) +
        (c.send_allowed ? 4 : 0) +
        (c.public_business ? 2 : 0);
      return score(b) - score(a);
    });

    return {
      ...row,
      resolved_entity_id: resolvedEntityId,
      contacts: list,
      primary_whatsapp: list.find((c) => c.whatsapp_candidate && c.send_allowed)?.normalized ?? null,
      contact_count: list.length,
      whatsapp_count: list.filter((c) => c.whatsapp_candidate).length,
      wa_reachable_count: list.filter((c) => c.whatsapp_reachable === true).length,
    };
  });
}


function safeConsentState(value: unknown) {
  const v = String(value ?? "").toLowerCase();
  return ["unknown", "public_business", "initiated", "opt_in", "partner_contract", "revoked"].includes(v)
    ? v
    : "unknown";
}

function safeVerificationStatus(value: unknown, reachable: boolean | null) {
  if (reachable === true) return "reachable";
  if (reachable === false) return "unreachable";
  const v = String(value ?? "").toLowerCase();
  return ["unknown", "observed", "verified", "reachable", "unreachable", "revoked"].includes(v)
    ? v
    : "observed";
}

function clampTrustScore(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, n));
}

async function ensureRegistryEntity(
  service: any,
  row: AnyRow,
  contact: ContactCandidate,
  e164: string,
  valueHash: string,
): Promise<string> {
  const direct = asUuid(contact.entity_id) || asUuid(row.resolved_entity_id);
  if (direct) return direct;

  const { data: existingContact, error: existingContactError } = await service
    .from("waouh_entity_contacts")
    .select("entity_id")
    .eq("value_hash", valueHash)
    .limit(1)
    .maybeSingle();
  if (existingContactError) throw existingContactError;
  if (existingContact?.entity_id) return String(existingContact.entity_id);

  const canonicalKey = `phone:${valueHash}`;
  const { data: existingEntity, error: existingEntityError } = await service
    .from("waouh_commerce_entities")
    .select("id,source_keys,primary_name,city,metadata")
    .eq("canonical_key", canonicalKey)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingEntityError) throw existingEntityError;

  const sourceKey = String(contact.source || row.source_key || "signal_fabric");
  const sourceFamily = String(row.source_family || "").toLowerCase();
  const partnerLike = contact.consent_state === "partner_contract" || sourceFamily === "partner";
  const businessLike =
    contact.public_business === true ||
    partnerLike ||
    ["maps", "directory", "b2b"].includes(sourceFamily) ||
    ["google_places", "benin_directory", "facebook_business", "instagram_business", "b2b_rfq"].includes(sourceKey);
  const primaryName = contact.label || row.actor_name || row.subject || null;
  const now = new Date().toISOString();

  if (existingEntity?.id) {
    const sourceKeys = [...new Set([
      ...(Array.isArray(existingEntity.source_keys) ? existingEntity.source_keys : []),
      sourceKey,
    ])];
    const { error: updateError } = await service
      .from("waouh_commerce_entities")
      .update({
        source_keys: sourceKeys,
        last_seen_at: now,
        primary_name: existingEntity.primary_name || primaryName,
        city: existingEntity.city || row.city || null,
        metadata: {
          ...(existingEntity.metadata || {}),
          contact_registry_last_fabric_id: row.fabric_id || null,
          contact_registry_last_seen_at: now,
        },
        updated_at: now,
      })
      .eq("id", existingEntity.id);
    if (updateError) throw updateError;
    return String(existingEntity.id);
  }

  const { data: created, error: createError } = await service
    .from("waouh_commerce_entities")
    .insert({
      entity_type: businessLike ? "business" : "person",
      primary_name: primaryName,
      canonical_key: canonicalKey,
      city: row.city || null,
      country_code: "BJ",
      verification_state: partnerLike
        ? "partner_verified"
        : businessLike
          ? "source_verified"
          : "unverified",
      trust_score: clampTrustScore(row.trust_score),
      source_keys: [sourceKey],
      metadata: {
        created_by: "admin_contact_hub",
        contact_registry_phone_hash: valueHash,
        contact_registry_origin_kind: contact.origin_kind,
        contact_registry_origin_id: contact.origin_id,
        contact_registry_fabric_id: row.fabric_id || null,
      },
      first_seen_at: now,
      last_seen_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (createError) throw createError;
  return String(created.id);
}

async function loadRegistryRows(
  service: any,
  body: Record<string, any>,
) {
  const limit = Math.max(1, Math.min(Number(body?.limit || 100), 300));
  const offset = Math.max(0, Number(body?.offset || 0));
  const source = body?.source ? String(body.source) : null;
  const whatsappOnly = body?.whatsapp_only === true;
  const q = String(body?.q || "").trim().toLowerCase();

  let query = service
    .from("waouh_entity_contacts")
    .select("id,entity_id,channel,value_encrypted,public_value,value_last4,source_key,is_public_business,consent_state,contactability_level,verified_at,verification_status,is_whatsapp_reachable,last_success_at,last_failure_at,sent_count,reply_count,failure_count,metrics,updated_at")
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (source) query = query.eq("source_key", source);
  if (whatsappOnly) query = query.in("channel", ["phone", "whatsapp"]);

  const { data: contacts, error } = await query;
  if (error) throw error;

  const entityIds = uniq((contacts ?? []).map((row: AnyRow) => asUuid(row.entity_id)));
  const sourceKeys = uniq((contacts ?? []).map((row: AnyRow) => String(row.source_key || "") || null));
  const [entitiesRes, sourcesRes] = await Promise.all([
    entityIds.length
      ? service.from("waouh_commerce_entities")
        .select("id,entity_type,primary_name,city,verification_state,trust_score,source_keys")
        .in("id", entityIds)
      : Promise.resolve({ data: [], error: null }),
    sourceKeys.length
      ? service.from("waouh_discovery_sources")
        .select("source_key,label,family,operational_state")
        .in("source_key", sourceKeys)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (entitiesRes.error) throw entitiesRes.error;
  if (sourcesRes.error) throw sourcesRes.error;

  const entityMap = indexBy(entitiesRes.data, "id");
  const sourceMap = indexBy(sourcesRes.data, "source_key");
  const rows: AnyRow[] = [];

  for (const row of contacts ?? []) {
    const clear = row.public_value || await safeDecrypt(row.value_encrypted);
    if (!clear) continue;
    const entity = entityMap.get(String(row.entity_id)) || {};
    const sourceInfo = sourceMap.get(String(row.source_key)) || {};
    const bucket = new Map<string, ContactCandidate>();
    addCandidate(bucket, {
      channel: String(row.channel || "phone"),
      value: String(clear),
      source: row.source_key || "contact_registry",
      origin_kind: "entity_contact",
      origin_id: row.id,
      contact_id: row.id,
      entity_id: row.entity_id,
      consent_state: row.consent_state,
      contactability_level: row.contactability_level || "C0",
      verification_status: row.verification_status,
      whatsapp_reachable: row.is_whatsapp_reachable,
      public_business: row.is_public_business,
      last_verified_at: row.verified_at,
      label: entity.primary_name || null,
    });
    const contact = [...bucket.values()][0];
    if (!contact) continue;

    const haystack = [
      entity.primary_name,
      entity.city,
      row.source_key,
      sourceInfo.label,
      clear,
      contact.normalized,
      row.value_last4,
    ].map((v) => String(v || "").toLowerCase()).join(" ");
    if (q && !haystack.includes(q)) continue;

    rows.push({
      fabric_id: `registry:${row.id}`,
      source_record_id: row.id,
      source_key: row.source_key || "contact_registry",
      source_label: sourceInfo.label || row.source_key || "Répertoire central",
      source_family: sourceInfo.family || "directory",
      operational_state: sourceInfo.operational_state || "live",
      intent: "CONTACT",
      actor_type: entity.entity_type || "unknown",
      subject: entity.primary_name || contact.display || "Contact centralisé",
      city: entity.city || null,
      contactability_level: row.contactability_level || "C0",
      source_url: null,
      contacts: [contact],
      primary_whatsapp: contact.whatsapp_candidate && contact.send_allowed ? contact.normalized : null,
      contact_count: 1,
      whatsapp_count: contact.whatsapp_candidate ? 1 : 0,
      wa_reachable_count: contact.whatsapp_reachable === true ? 1 : 0,
      trust_score: entity.trust_score ?? null,
      registry_only: true,
    });
  }

  return {
    rows,
    page: {
      offset,
      limit,
      source_rows: (contacts ?? []).length,
      has_more: (contacts ?? []).length === limit,
    },
    stats: {
      rows: rows.length,
      contacts: rows.length,
      whatsapp: rows.filter((r: AnyRow) => r.whatsapp_count > 0).length,
      reachable: rows.filter((r: AnyRow) => r.wa_reachable_count > 0).length,
      sendable: rows.filter((r: AnyRow) => r.contacts?.[0]?.send_allowed).length,
    },
  };
}

async function getRegistryContact(service: any, contactId: string) {
  const { data: row, error } = await service
    .from("waouh_entity_contacts")
    .select("id,entity_id,channel,value_encrypted,public_value,source_key,is_public_business,consent_state,contactability_level,verified_at,verification_status,is_whatsapp_reachable")
    .eq("id", contactId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const clear = row.public_value || await safeDecrypt(row.value_encrypted);
  if (!clear) return null;
  const bucket = new Map<string, ContactCandidate>();
  addCandidate(bucket, {
    channel: String(row.channel || "phone"),
    value: String(clear),
    source: row.source_key || "contact_registry",
    origin_kind: "entity_contact",
    origin_id: row.id,
    contact_id: row.id,
    entity_id: row.entity_id,
    consent_state: row.consent_state,
    contactability_level: row.contactability_level || "C0",
    verification_status: row.verification_status,
    whatsapp_reachable: row.is_whatsapp_reachable,
    public_business: row.is_public_business,
    last_verified_at: row.verified_at,
  });
  return [...bucket.values()][0] || null;
}

async function materializeEntityContacts(service: any, rows: AnyRow[], adminUserId: string) {
  const now = new Date().toISOString();
  const candidates = new Map<string, AnyRow>();
  let skippedNoEntity = 0;
  let skippedRevoked = 0;
  let skippedInvalid = 0;

  for (const row of rows) {
    const rowEntityId = asUuid(row.resolved_entity_id);
    for (const contact of (row.contacts ?? []) as ContactCandidate[]) {
      let entityId = asUuid(contact.entity_id) || rowEntityId;
      const e164 = contact.normalized ? normalizeE164(contact.normalized, "+229") : null;
      if (!e164) { skippedInvalid++; continue; }
      if (contact.opted_out || consentRevoked(contact.consent_state)) { skippedRevoked++; continue; }

      const channel = contact.channel === "whatsapp" ? "whatsapp" : "phone";
      const valueHash = await hashPhone(e164);
      if (!entityId) {
        try {
          entityId = await ensureRegistryEntity(service, row, contact, e164, valueHash);
        } catch (entityError) {
          console.warn("[waouh-admin-contact-hub] entity materialization skipped", {
            fabric_id: row.fabric_id,
            source_key: row.source_key,
            error: entityError instanceof Error ? entityError.message : String(entityError),
          });
          skippedNoEntity++;
          continue;
        }
      }
      const key = `${entityId}:${channel}:${valueHash}`;
      if (candidates.has(key)) continue;

      candidates.set(key, {
        entity_id: entityId,
        channel,
        value_encrypted: await encryptPhone(e164),
        value_hash: valueHash,
        value_last4: phoneLast4(e164),
        public_value: null,
        source_key: contact.source || row.source_key || "signal_fabric",
        is_public_business: contact.public_business === true,
        consent_state: safeConsentState(contact.consent_state),
        contactability_level: contactLevelAllowed(contact.contactability_level)
          ? String(contact.contactability_level).toUpperCase()
          : "C0",
        verified_at: contact.whatsapp_reachable === true
          ? (contact.last_verified_at || now)
          : null,
        verification_status: safeVerificationStatus(contact.verification_status, contact.whatsapp_reachable),
        is_whatsapp_reachable: contact.whatsapp_reachable,
        metrics: {
          materialized_from: "admin_contact_hub",
          fabric_id: row.fabric_id,
          origin_kind: contact.origin_kind,
          origin_id: contact.origin_id,
          admin_user_id: adminUserId,
          materialized_at: now,
        },
        updated_at: now,
      });
    }
  }

  const payload = [...candidates.values()];
  if (!payload.length) {
    return {
      attempted: 0,
      written: 0,
      skipped_no_entity: skippedNoEntity,
      skipped_revoked: skippedRevoked,
      skipped_invalid: skippedInvalid,
    };
  }

  const hashes = [...new Set(payload.map((row: AnyRow) => String(row.value_hash)).filter(Boolean))];
  const existingByKey = new Map<string, AnyRow>();
  for (let i = 0; i < hashes.length; i += 100) {
    const hashBatch = hashes.slice(i, i + 100);
    const { data: existingRows, error: existingError } = await service
      .from("waouh_entity_contacts")
      .select("id,entity_id,channel,value_hash,source_key,is_public_business,consent_state,contactability_level,metrics,verified_at,verification_status,is_whatsapp_reachable")
      .in("value_hash", hashBatch);
    if (existingError) throw existingError;
    for (const row of existingRows ?? []) {
      existingByKey.set(`${row.entity_id}:${row.channel}:${row.value_hash}`, row);
    }
  }

  const inserts: AnyRow[] = [];
  const updates: Array<{ id: string; values: AnyRow }> = [];
  for (const row of payload) {
    const key = `${row.entity_id}:${row.channel}:${row.value_hash}`;
    const existing = existingByKey.get(key);
    if (!existing) {
      inserts.push(row);
      continue;
    }

    updates.push({
      id: existing.id,
      values: {
        source_key: row.source_key,
        is_public_business: existing.is_public_business === true || row.is_public_business === true,
        consent_state: existing.consent_state && existing.consent_state !== "unknown"
          ? existing.consent_state
          : row.consent_state,
        contactability_level: contactLevelAllowed(existing.contactability_level)
          ? existing.contactability_level
          : row.contactability_level,
        verified_at: existing.verified_at || row.verified_at,
        verification_status: existing.verification_status && existing.verification_status !== "unknown"
          ? existing.verification_status
          : row.verification_status,
        is_whatsapp_reachable: existing.is_whatsapp_reachable ?? row.is_whatsapp_reachable,
        metrics: {
          ...(existing.metrics || {}),
          ...(row.metrics || {}),
          rematerialized_at: now,
        },
        updated_at: now,
      },
    });
  }

  let inserted = 0;
  for (let i = 0; i < inserts.length; i += 100) {
    const batch = inserts.slice(i, i + 100);
    const { data, error } = await service.from("waouh_entity_contacts").insert(batch).select("id");
    if (error) throw error;
    inserted += (data ?? []).length;
  }

  let updated = 0;
  for (const item of updates) {
    const { error } = await service.from("waouh_entity_contacts").update(item.values).eq("id", item.id);
    if (error) throw error;
    updated += 1;
  }

  return {
    attempted: payload.length,
    written: inserted,
    updated,
    skipped_no_entity: skippedNoEntity,
    skipped_revoked: skippedRevoked,
    skipped_invalid: skippedInvalid,
  };
}

async function getFabricRow(service: any, fabricId: string) {
  const { data, error } = await service.from("waouh_signal_fabric")
    .select("*").eq("fabric_id", fabricId).maybeSingle();
  if (error) throw error;
  return data;
}

async function getResolvedContact(service: any, fabricId: string, phone: string) {
  const raw = await getFabricRow(service, fabricId);
  if (!raw) return { row: null, contact: null };
  const [row] = await enrichFabricRows(service, [raw]);
  const normalized = normalizeE164(phone, "+229");
  const contact = (row?.contacts ?? []).find((c: ContactCandidate) =>
    normalized ? c.normalized === normalized : c.value === phone
  ) ?? null;
  return { row, contact };
}

function wahaHeaders() {
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  const apiKey = Deno.env.get("WAHA_API_KEY")?.trim();
  const user = Deno.env.get("WAHA_USERNAME") || Deno.env.get("WAHA_DASHBOARD_USERNAME");
  const pass = Deno.env.get("WAHA_PASSWORD") || Deno.env.get("WAHA_DASHBOARD_PASSWORD");
  if (apiKey) headers["X-Api-Key"] = apiKey;
  if (user && pass) headers.Authorization = `Basic ${btoa(`${user}:${pass}`)}`;
  return headers;
}

async function activeWahaSession() {
  const base = (Deno.env.get("WAHA_BASE_URL") || "https://waha.bot.bj").replace(/\/$/, "");
  const headers = wahaHeaders();
  const preferred = Deno.env.get("WAHA_SESSION") || "WaouhApp";
  const response = await fetch(`${base}/api/sessions`, {
    headers,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`WAHA sessions HTTP ${response.status}`);
  const sessions = await response.json().catch(() => []);
  const working = (Array.isArray(sessions) ? sessions : []).filter((s: AnyRow) => s?.status === "WORKING");
  const session = working.find((s: AnyRow) => s?.name === preferred)?.name || working[0]?.name;
  if (!session) throw new Error("WAHA_NO_WORKING_SESSION");
  return { base, headers, session: String(session) };
}

async function checkWahaExists(e164: string) {
  const { base, headers, session } = await activeWahaSession();
  let lastStatus = 0;
  for (const phone of phoneCandidates(e164)) {
    const paths = [
      `/api/${encodeURIComponent(session)}/contacts/check-exists?phone=${encodeURIComponent(phone)}`,
      `/api/contacts/check-exists?phone=${encodeURIComponent(phone)}&session=${encodeURIComponent(session)}`,
    ];
    for (const path of paths) {
      try {
        const response = await fetch(`${base}${path}`, {
          headers,
          signal: AbortSignal.timeout(5000),
        });
        lastStatus = response.status;
        if (!response.ok) {
          await response.text().catch(() => "");
          continue;
        }
        const data = await response.json().catch(() => ({}));
        const exists = data?.numberExists ?? data?.exists ?? data?.isRegistered ??
          data?.is_registered ?? !!(data?.chatId || data?.jid || data?.id);
        const chatId = data?.chatId || data?.jid || data?.id || null;
        if (exists) return { exists: true, chat_id: chatId ? String(chatId) : null, session, checked_phone: phone };
      } catch {
        // Try the next WAHA route/candidate.
      }
    }
  }
  return { exists: false, chat_id: null, session, checked_phone: null, status: lastStatus };
}

async function updateVerifiedSource(service: any, contact: ContactCandidate, e164: string, chatId: string | null) {
  const now = new Date().toISOString();
  if (contact.contact_id) {
    const { data: current } = await service.from("waouh_entity_contacts")
      .select("*").eq("id", contact.contact_id).maybeSingle();
    if (current) {
      await service.from("waouh_entity_contacts").update({
        verified_at: now,
        verification_status: "reachable",
        is_whatsapp_reachable: true,
        updated_at: now,
        metrics: { ...(current.metrics || {}), waha_chat_id: chatId, last_waha_check_at: now },
      }).eq("id", contact.contact_id);

      if (current.channel === "phone" && current.entity_id && current.value_hash) {
        const { data: existingWa } = await service.from("waouh_entity_contacts")
          .select("id").eq("entity_id", current.entity_id).eq("channel", "whatsapp")
          .eq("value_hash", current.value_hash).maybeSingle();
        if (!existingWa) {
          await service.from("waouh_entity_contacts").insert({
            entity_id: current.entity_id,
            channel: "whatsapp",
            value_encrypted: current.value_encrypted,
            value_hash: current.value_hash,
            value_last4: phoneLast4(e164),
            public_value: current.public_value,
            source_key: current.source_key,
            is_public_business: current.is_public_business,
            consent_state: current.consent_state,
            contactability_level: current.contactability_level,
            verified_at: now,
            verification_status: "reachable",
            is_whatsapp_reachable: true,
            metrics: { waha_chat_id: chatId, normalized_from_phone_contact: true, last_waha_check_at: now },
          });
        }
      }
    }
  }

  if (!contact.origin_id) return;
  if (contact.origin_kind === "catalog") {
    await service.from("waouh_unified_catalog").update({ vendeur_whatsapp: e164 }).eq("id", contact.origin_id);
  } else if (contact.origin_kind === "partner_business") {
    await service.from("waouh_partner_businesses").update({ whatsapp: e164 }).eq("id", contact.origin_id);
  } else if (contact.origin_kind === "article") {
    await service.from("waouh_articles").update({ contact_whatsapp: e164 }).eq("id", contact.origin_id);
  }
}

async function assertNotOptedOut(service: any, e164: string) {
  const variants = phoneCandidates(e164).map((v) => `+${v}`);
  const { data: radar } = await service.from("waouh_radar_contacts")
    .select("id,status").or(variants.flatMap((v) => [
      `phone_e164.eq.${v}`,
      `phone_e164_normalized.eq.${v}`,
    ]).join(",")).limit(5);
  if ((radar ?? []).some((r: AnyRow) => ["opted_out", "blocked"].includes(String(r.status)))) {
    throw new Error("CONTACT_OPTED_OUT");
  }

  const { data: wa } = await service.from("wa_contacts")
    .select("id,opt_out,archived").in("phone_e164", variants).limit(10);
  if ((wa ?? []).some((r: AnyRow) => r.opt_out === true || r.archived === true)) {
    throw new Error("CONTACT_OPTED_OUT");
  }
}


export async function handleAdminContactHub(
  service: any,
  user: { id: string },
  body: Record<string, any>,
): Promise<Response> {
  try {
    const action = String(body?.action || "contact_hub_search");
    if (action === "contact_hub_search") {
      const limit = Math.max(1, Math.min(Number(body?.limit || 150), 300));
      const { data, error } = await service.rpc("waouh_admin_signal_fabric_search", {
        p_q: body?.q ? String(body.q).trim() : null,
        p_city: body?.city ? String(body.city).trim() : null,
        p_family: body?.family || null,
        p_source: body?.source || null,
        p_intent: body?.intent || null,
        p_contactability: body?.contactability || null,
        p_operational_state: body?.operational_state || null,
        p_limit: limit,
        p_offset: Math.max(0, Number(body?.offset || 0)),
      });
      if (error) throw error;
      const sourceRows = (data ?? []) as AnyRow[];
      let rows = await enrichFabricRows(service, sourceRows);
      if (body?.contacts_only !== false) rows = rows.filter((r: AnyRow) => r.contact_count > 0);
      if (body?.whatsapp_only === true) rows = rows.filter((r: AnyRow) => r.whatsapp_count > 0);
      const offset = Math.max(0, Number(body?.offset || 0));
      return json({
        ok: true,
        rows,
        page: {
          offset,
          limit,
          source_rows: sourceRows.length,
          has_more: sourceRows.length === limit,
        },
        stats: {
          rows: rows.length,
          contacts: rows.reduce((n: number, r: AnyRow) => n + Number(r.contact_count || 0), 0),
          whatsapp: rows.reduce((n: number, r: AnyRow) => n + Number(r.whatsapp_count || 0), 0),
          reachable: rows.reduce((n: number, r: AnyRow) => n + Number(r.wa_reachable_count || 0), 0),
          sendable: rows.reduce((n: number, r: AnyRow) =>
            n + (r.contacts || []).filter((c: ContactCandidate) => c.send_allowed).length, 0),
        },
      });
    }

    if (action === "contact_hub_registry") {
      const registry = await loadRegistryRows(service, body);
      return json({ ok: true, ...registry });
    }

    if (action === "contact_hub_materialize") {
      const limit = Math.max(1, Math.min(Number(body?.limit || 100), 150));
      const offset = Math.max(0, Number(body?.offset || 0));
      const { data, error } = await service.rpc("waouh_admin_signal_fabric_search", {
        p_q: body?.q ? String(body.q).trim() : null,
        p_city: body?.city ? String(body.city).trim() : null,
        p_family: body?.family || null,
        p_source: body?.source || null,
        p_intent: body?.intent || null,
        p_contactability: body?.contactability || null,
        p_operational_state: body?.operational_state || null,
        p_limit: limit,
        p_offset: offset,
      });
      if (error) throw error;
      const sourceRows = (data ?? []) as AnyRow[];
      const rows = await enrichFabricRows(service, sourceRows);
      const result = await materializeEntityContacts(service, rows, user.id);
      return json({
        ok: true,
        ...result,
        page: {
          offset,
          limit,
          source_rows: sourceRows.length,
          has_more: sourceRows.length === limit,
        },
      });
    }

    if (action === "contact_hub_verify") {
      const fabricId = String(body?.fabric_id || "");
      const requested = String(body?.phone || "");
      const contactId = asUuid(body?.contact_id);
      if ((!fabricId && !contactId) || !requested) {
        return json({ ok: false, error: "contact_reference_and_phone_required" }, 422);
      }
      const registryContact = contactId ? await getRegistryContact(service, contactId) : null;
      const resolved = registryContact
        ? { row: { fabric_id: `registry:${contactId}`, source_key: registryContact.source }, contact: registryContact }
        : await getResolvedContact(service, fabricId, requested);
      const { row, contact } = resolved;
      if (!row || !contact || !contact.normalized) return json({ ok: false, error: "contact_not_found" }, 404);
      if (consentRevoked(contact.consent_state) || contact.opted_out) {
        return json({ ok: false, error: "contact_opted_out" }, 403);
      }
      const check = await checkWahaExists(contact.normalized);
      if (check.exists) await updateVerifiedSource(service, contact, contact.normalized, check.chat_id);
      return json({ ok: true, ...check, normalized: contact.normalized, display: formatPhoneDisplay(contact.normalized) });
    }

    if (action === "contact_hub_send") {
      const fabricId = String(body?.fabric_id || "");
      const requested = String(body?.phone || "");
      const contactId = asUuid(body?.contact_id);
      const message = String(body?.message || "").trim();
      if ((!fabricId && !contactId) || !requested || !message) {
        return json({ ok: false, error: "contact_reference_phone_message_required" }, 422);
      }
      if (message.length > 3000) return json({ ok: false, error: "message_too_long" }, 422);

      const registryContact = contactId ? await getRegistryContact(service, contactId) : null;
      const resolved = registryContact
        ? { row: { fabric_id: `registry:${contactId}`, source_key: registryContact.source }, contact: registryContact }
        : await getResolvedContact(service, fabricId, requested);
      const { row, contact } = resolved;
      if (!row || !contact || !contact.normalized) return json({ ok: false, error: "contact_not_found" }, 404);
      if (!contact.send_allowed) {
        return json({
          ok: false,
          error: consentRevoked(contact.consent_state) || contact.opted_out
            ? "contact_opted_out"
            : "contact_not_actionable",
          contactability_level: contact.contactability_level,
        }, 403);
      }

      await assertNotOptedOut(service, contact.normalized);
      const check = await checkWahaExists(contact.normalized);
      if (!check.exists) {
        if (contact.contact_id) {
          await service.from("waouh_entity_contacts").update({
            verification_status: "unreachable",
            is_whatsapp_reachable: false,
            last_failure_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", contact.contact_id);
        }
        return json({ ok: false, error: "not_on_whatsapp", normalized: contact.normalized }, 422);
      }
      await updateVerifiedSource(service, contact, contact.normalized, check.chat_id);

      const bucket = Math.floor(Date.now() / 60_000);
      const contactReference = contactId || fabricId;
      const dedupe = `admin-contact-hub:${user.id}:${contactReference}:${contact.normalized}:${bucket}:${await sha256Hex(message)}`;
      const payload = {
        text: message,
        fabric_id: fabricId || null,
        contact_id: contact.contact_id || contactId || null,
        source_key: row.source_key,
        contact_id: contact.contact_id,
        admin_user_id: user.id,
        admin_contact_hub: true,
        waha_verified: true,
        waha_session: check.session,
      };
      const { data: queueId, error: queueError } = await service.rpc("waouh_enqueue_outbound_v2", {
        p_to_phone: contact.normalized,
        p_to_user_id: null,
        p_template: "admin_contact_hub",
        p_payload: payload,
        p_web_session_id: null,
        p_image_url: null,
        p_channel: "whatsapp",
        p_message_id: null,
        p_transaction_id: null,
        p_dedupe_key: dedupe,
        p_event_type: "admin_contact_hub",
      });
      if (queueError) throw queueError;

      let dispatch: AnyRow | null = null;
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/waouh-outbound-dispatch`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE}`,
            apikey: SERVICE_ROLE,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ manual: true, limit: 20 }),
          signal: AbortSignal.timeout(20_000),
        });
        dispatch = await response.json().catch(() => ({ ok: response.ok, status: response.status }));
      } catch (error) {
        dispatch = { ok: false, deferred: true, error: error instanceof Error ? error.message : String(error) };
      }

      const { data: queueRow } = await service.from("waouh_outbound_queue")
        .select("id,status,last_error,sent_at,attempts")
        .eq("id", queueId).maybeSingle();

      return json({
        ok: true,
        queue_id: queueId,
        queue: queueRow,
        dispatch,
        phone: contact.normalized,
        display: formatPhoneDisplay(contact.normalized),
        waha_chat_id: check.chat_id,
        waha_session: check.session,
      });
    }

    return json({ ok: false, error: "unknown_action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "CONTACT_OPTED_OUT" ? 403 : 500;
    console.error("[waouh-admin-contact-hub]", { message });
    return json({ ok: false, error: message }, status);
  }
}
