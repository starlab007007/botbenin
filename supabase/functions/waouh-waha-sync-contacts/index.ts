import { createClient } from 'npm:@supabase/supabase-js@2';
import { encryptPhone, hashPhone } from '../_shared/waouh-tel/crypto.ts';
import { requireRuntimeOrAdmin } from '../_shared/waouh-runtime-auth.ts';
import { phoneLast4 } from '../_shared/waouh-tel/phone.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WahaContact {
  id?: string;
  number?: string;
  phoneNumber?: string;
  pushname?: string;
  name?: string;
  shortName?: string;
  lid?: string;
}


async function materializeWahaDirectoryContacts(
  supabase: any,
  rows: any[],
  session: string,
  fresh = true,
) {
  const now = new Date().toISOString();
  const unique = new Map<string, { e164: string; hash: string; name: string | null }>();

  for (const row of rows) {
    const e164 = normalizeWahaPhone(row.phone_e164 || row.phone);
    if (!e164) continue;
    const hash = await hashPhone(e164);
    if (!unique.has(hash)) {
      unique.set(hash, {
        e164,
        hash,
        name: row.display_name || row.pushname || null,
      });
    }
  }

  const candidates = [...unique.values()];
  if (!candidates.length) {
    return { candidates: 0, entities_created: 0, contacts_created: 0, contacts_verified: 0 };
  }

  const hashes = candidates.map((row) => row.hash);
  const existingContacts: any[] = [];
  for (let i = 0; i < hashes.length; i += 100) {
    const { data, error } = await supabase
      .from('waouh_entity_contacts')
      .select('id,entity_id,channel,value_hash,source_key,consent_state,contactability_level,metrics')
      .in('value_hash', hashes.slice(i, i + 100));
    if (error) throw error;
    existingContacts.push(...(data || []));
  }

  const revokedHashes = new Set(existingContacts.filter(c => c.consent_state === "revoked").map(c => c.value_hash));
  const entityByHash = new Map<string, string>();
  const whatsappExisting = new Set<string>();
  for (const contact of existingContacts) {
    if (contact?.value_hash && contact?.entity_id && !entityByHash.has(String(contact.value_hash))) {
      entityByHash.set(String(contact.value_hash), String(contact.entity_id));
    }
    if (contact?.channel === 'whatsapp' && contact?.entity_id && contact?.value_hash) {
      whatsappExisting.add(String(contact.entity_id) + ':' + String(contact.value_hash));
    }
  }

  const missingKeys = candidates
    .filter((row) => !entityByHash.has(row.hash))
    .map((row) => 'phone:' + row.hash);
  const existingEntities: any[] = [];
  for (let i = 0; i < missingKeys.length; i += 100) {
    const { data, error } = await supabase
      .from('waouh_commerce_entities')
      .select('id,canonical_key')
      .in('canonical_key', missingKeys.slice(i, i + 100));
    if (error) throw error;
    existingEntities.push(...(data || []));
  }
  for (const entity of existingEntities) {
    const key = String(entity.canonical_key || '');
    if (key.startsWith('phone:')) entityByHash.set(key.slice(6), String(entity.id));
  }

  let entitiesCreated = 0;
  const missingEntities = candidates
    .filter((row) => !entityByHash.has(row.hash))
    .map((row) => ({
      entity_type: 'person',
      primary_name: row.name,
      canonical_key: 'phone:' + row.hash,
      country_code: 'BJ',
      verification_state: fresh ? 'source_verified' : 'unverified',
      trust_score: 50,
      source_keys: ['waha_directory'],
      metadata: {
        created_by: 'waouh-waha-sync-contacts',
        waha_directory: true,
        first_session: session,
      },
      first_seen_at: now,
      last_seen_at: now,
      updated_at: now,
    }));

  for (let i = 0; i < missingEntities.length; i += 100) {
    const batch = missingEntities.slice(i, i + 100);
    const { data, error } = await supabase
      .from('waouh_commerce_entities')
      .insert(batch)
      .select('id,canonical_key');
    if (error) throw error;
    for (const entity of data || []) {
      const key = String(entity.canonical_key || '');
      if (key.startsWith('phone:')) entityByHash.set(key.slice(6), String(entity.id));
    }
    entitiesCreated += (data || []).length;
  }

  let contactsVerified = 0;
  for (let i = 0; fresh && i < hashes.length; i += 100) {
    const { data, error } = await supabase
      .from('waouh_entity_contacts')
      .update({
        is_whatsapp_reachable: true,
        verification_status: 'reachable',
        verified_at: now,
        updated_at: now,
      })
      .in('value_hash', hashes.slice(i, i + 100).filter(hash => !revokedHashes.has(hash)))
      .in('channel', ['phone', 'whatsapp'])
      .select('id');
    if (error) throw error;
    contactsVerified += (data || []).length;
  }

  const inserts: any[] = [];
  for (const row of candidates) {
    const entityId = entityByHash.get(row.hash);
    if (!entityId || whatsappExisting.has(entityId + ':' + row.hash)) continue;
    inserts.push({
      entity_id: entityId,
      channel: 'whatsapp',
      value_encrypted: await encryptPhone(row.e164),
      value_hash: row.hash,
      value_last4: phoneLast4(row.e164),
      public_value: null,
      source_key: 'waha_directory',
      is_public_business: false,
      consent_state: revokedHashes.has(row.hash) ? 'revoked' : 'unknown',
      contactability_level: 'C0',
      verified_at: fresh ? now : null,
      verification_status: revokedHashes.has(row.hash) ? 'revoked' : fresh ? 'reachable' : 'unknown',
      is_whatsapp_reachable: revokedHashes.has(row.hash) ? false : fresh ? true : null,
      metrics: {
        materialized_from: 'waouh-waha-sync-contacts',
        waha_session: session,
        waha_directory: true,
        last_waha_sync_at: fresh ? now : null,
        cached_directory_import: !fresh,
      },
      updated_at: now,
    });
  }

  let contactsCreated = 0;
  for (let i = 0; i < inserts.length; i += 100) {
    const { data, error } = await supabase
      .from('waouh_entity_contacts')
      .insert(inserts.slice(i, i + 100))
      .select('id');
    if (error) throw error;
    contactsCreated += (data || []).length;
  }

  return {
    candidates: candidates.length,
    entities_created: entitiesCreated,
    contacts_created: contactsCreated,
    contacts_verified: contactsVerified,
  };
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const guard = await requireRuntimeOrAdmin(req, supabase);
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  if (body.import_cached === true) {
    const cached: any[] = [];
    for (let offset = 0; offset < 10000; offset += 1000) {
      const { data, error } = await supabase.from('waouh_lid_phone_map').select('phone_e164,phone,display_name').range(offset, offset + 999);
      if (error) return json({ ok: false, error: error.message }, 500);
      cached.push(...(data ?? []));
      if ((data ?? []).length < 1000) break;
    }
    const result = await materializeWahaDirectoryContacts(supabase, cached, 'historical_directory', false);
    return json({ ok: true, mode: 'cached_import_not_live_verification', ...result });
  }

  const backfill = body.backfill !== false;
  const maxSessions = Math.max(1, Math.min(Number(body.maxSessions || 1), 3));
  // WAHA currently exposes >1,700 contacts on the canonical session.
  // Process the complete address book by default; writes are already chunked
  // by 500 rows below, so raising this cap does not create oversized upserts.
  const maxContactsPerSession = Math.max(100, Math.min(Number(body.maxContactsPerSession || 2500), 5000));
  const cursor = body.cursor ? String(body.cursor) : null;
  const requestedSessions: string[] | null = Array.isArray(body.sessions) && body.sessions.length
    ? body.sessions.map((s: any) => String(s))
    : (body.session ? [String(body.session)] : null);

  const wahaBase = (Deno.env.get('WAHA_BASE_URL') || 'https://waha.bot.bj').replace(/\/$/, '');
  const wahaUser = Deno.env.get('WAHA_USERNAME') || Deno.env.get('WAHA_DASHBOARD_USERNAME');
  const wahaPass = Deno.env.get('WAHA_PASSWORD') || Deno.env.get('WAHA_DASHBOARD_PASSWORD');
  const wahaApiKey = Deno.env.get('WAHA_API_KEY');
  if (!wahaApiKey && !(wahaUser && wahaPass)) {
    return json({ error: 'WAHA credentials missing (set WAHA_API_KEY or WAHA_USERNAME/PASSWORD)' }, 500);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (wahaApiKey) headers['X-Api-Key'] = wahaApiKey;
  if (wahaUser && wahaPass) headers['Authorization'] = 'Basic ' + btoa(`${wahaUser}:${wahaPass}`);

  const runRes = await supabase
    .from('waouh_lid_sync_runs')
    .insert({ session: requestedSessions ? requestedSessions.join(',') : 'auto', status: 'running' })
    .select('id')
    .single();
  const runId = runRes.data?.id;

  try {
    // 1) Resolve target sessions: explicit list OR every WORKING session
    let sessionsToUse: string[] = [];
    let totalWorkingSessions = 0;
    let startIndex = 0;
    if (requestedSessions) {
      sessionsToUse = requestedSessions.slice(0, maxSessions);
      totalWorkingSessions = requestedSessions.length;
    } else {
      const sRes = await fetch(`${wahaBase}/api/sessions`, { headers });
      if (!sRes.ok) {
        const t = await sRes.text();
        throw new Error(`WAHA /api/sessions HTTP ${sRes.status}: ${t.slice(0, 200)}`);
      }
      const list = await sRes.json();
      const workingSessions = (Array.isArray(list) ? list : [])
        .filter((s: any) => s?.status === 'WORKING')
        .map((s: any) => s.name)
        .filter(Boolean);
      totalWorkingSessions = workingSessions.length;
      startIndex = cursor ? Math.max(0, workingSessions.indexOf(cursor) + 1) : 0;
      sessionsToUse = workingSessions.slice(startIndex, startIndex + maxSessions);

      try {
        await Promise.all((Array.isArray(list) ? list : []).map((s: any) => supabase
          .from('waha_sessions_data')
          .upsert({
            session_name: s?.name,
            status: s?.status || 'DISCONNECTED',
            phone_number: normalizeWahaPhone(s?.me?.id || s?.me?.number || s?.config?.metadata?.phone_number || null),
            account_info: s?.config || {},
            metadata: s?.metadata || {},
            server_name: 'WAHA',
            last_activity: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'session_name' })));
      } catch (syncSessionsError) {
        console.warn('[waouh-waha-sync-contacts] session cache sync skipped', syncSessionsError);
      }
    }

    if (sessionsToUse.length === 0) {
      await supabase.from('waouh_lid_sync_runs').update({
        status: 'success', contacts_fetched: 0, contacts_mapped: 0, rows_backfilled: 0,
        error: 'Aucune session WAHA active (WORKING). Veuillez scanner le QR-code dans WAHA pour activer au moins une session.',
        finished_at: new Date().toISOString(),
      }).eq('id', runId);
      return json({
        ok: true,
        warning: 'Aucune session WAHA active (WORKING). Connectez au moins une session via QR-code.',
        sessions: [], fetched: 0, mapped: 0, backfilled: 0, centralized: 0, perSession: [],
      });
    }

    let totalFetched = 0, totalMapped = 0, totalBackfilled = 0, totalCentralized = 0;
    const perSession: any[] = [];

    for (const session of sessionsToUse) {
      const sessionResult: any = { session, fetched: 0, mapped: 0, backfilled: 0, ok: false };
      try {
        const url = `${wahaBase}/api/contacts/all?session=${encodeURIComponent(session)}`;
        const resp = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
        if (!resp.ok) {
          const text = await resp.text();
          sessionResult.error = `HTTP ${resp.status}: ${text.slice(0, 200)}`;
          perSession.push(sessionResult);
          continue;
        }
        const allContacts: WahaContact[] = await resp.json();
        const contacts = Array.isArray(allContacts) ? allContacts.slice(0, maxContactsPerSession) : [];
        const fetched = Array.isArray(allContacts) ? allContacts.length : 0;
        sessionResult.fetched = fetched;
        sessionResult.processed = contacts.length;
        if (fetched > contacts.length) sessionResult.warning = `Lot limité à ${contacts.length}/${fetched} contacts pour éviter la limite CPU Supabase.`;
        totalFetched += fetched;

        const rows: any[] = [];
        const phoneRowsByName = new Map<string, any>();
        for (const c of contacts || []) {
          const id = c.id || '';
          const rawPhone = c.number || c.phoneNumber || (id.includes('@') ? id.split('@')[0] : '');
          const digits = (rawPhone || '').replace(/\D/g, '');
          if (!digits || !isLikelyPhoneDigits(digits)) continue;

          const lidId = c.lid || (id.endsWith('@lid') ? id.split('@')[0] : null);

          // 🛟 Refuse d'écrire phone_e164 == LID : WAHA renvoie souvent l'ID privacy
          // comme "number" et on se retrouve avec un faux numéro 15+ chiffres qui
          // casse toute la chaîne d'envoi WhatsApp. Dans ce cas on stocke NULL.
          const phoneIsActuallyLid = lidId && digits === lidId;
          const phone_e164 = phoneIsActuallyLid
            ? null
            : (normalizeWahaPhone(digits) || (digits.startsWith('229') ? `+${digits}` : `+${digits}`));
          const phoneStored = phoneIsActuallyLid ? null : digits;

          const displayName = c.name || c.shortName || null;
          const pushname = c.pushname || null;
          const rowBase = {
            jid: id, phone: phoneStored, phone_e164,
            pushname,
            display_name: displayName,
            session, last_synced_at: new Date().toISOString(),
          };
          if (lidId) {
            rows.push({ lid: lidId, ...rowBase });
          }
          if (id && !id.endsWith('@lid')) {
            rows.push({ lid: id, ...rowBase });
          }
          for (const name of [displayName, pushname]) {
            const key = nameKey(name);
            if (key && !phoneIsActuallyLid && isBjPhoneDigits(digits)) {
              const previous = phoneRowsByName.get(key);
              if (previous && previous.phone_e164 !== phone_e164) phoneRowsByName.set(key, { ambiguous: true });
              else if (!previous?.ambiguous) phoneRowsByName.set(key, { ...rowBase, lid: lidId || id });
            }
          }
        }


        for (const c of contacts || []) {
          const id = c.id || '';
          if (!id.endsWith('@lid')) continue;
          const lidId = c.lid || id.split('@')[0];
          const linked = phoneRowsByName.get(nameKey(c.name || c.shortName)) || phoneRowsByName.get(nameKey(c.pushname));
          if (linked && !linked.ambiguous && lidId) rows.push({ ...linked, lid: lidId, jid: id });
        }

        // Dedupe rows by lid (last wins)
        const dedup = new Map<string, any>();
        for (const r of rows) dedup.set(r.lid, r);
        const finalRows = [...dedup.values()];

        for (let i = 0; i < finalRows.length; i += 500) {
          const chunk = finalRows.slice(i, i + 500);
          const { error } = await supabase
            .from('waouh_lid_phone_map')
            .upsert(chunk, { onConflict: 'lid' });
          if (error) throw error;
          sessionResult.mapped += chunk.length;
        }
        totalMapped += sessionResult.mapped;

        if (finalRows.length) {
          const centralized = await materializeWahaDirectoryContacts(supabase, finalRows, session);
          sessionResult.centralized = centralized;
          totalCentralized += Number(centralized.contacts_created || 0) + Number(centralized.contacts_verified || 0);
        }

        if (backfill && finalRows.length) {
          let backfilledForSession = 0;
          for (const r of finalRows) {
            if (backfilledForSession >= 100) break;
            const variants = [r.lid, `${r.lid}@lid`, r.jid].filter(Boolean);
            const { data: upd1 } = await supabase
              .from('waouh_unified_catalog')
              .update({ vendeur_phone: r.phone_e164 })
              .in('vendeur_phone', variants)
              .select('id');
            const { data: upd2 } = await supabase
              .from('waouh_unified_catalog')
              .update({ vendeur_whatsapp: r.phone_e164 })
              .in('vendeur_whatsapp', variants)
              .select('id');
            sessionResult.backfilled += (upd1?.length || 0) + (upd2?.length || 0);
            backfilledForSession++;
          }
          totalBackfilled += sessionResult.backfilled;
        }
        sessionResult.ok = true;
      } catch (e) {
        sessionResult.error = e instanceof Error ? e.message : String(e);
      }
      perSession.push(sessionResult);
    }

    await supabase.from('waouh_lid_sync_runs').update({
      contacts_fetched: totalFetched,
      contacts_mapped: totalMapped,
      rows_backfilled: totalBackfilled,
      status: perSession.every((s: any) => s.ok) ? 'success' : 'failed',
      error: perSession.filter((s: any) => !s.ok).map((s: any) => String(s.error || 'contact_sync_failed').slice(0, 240)).join(' | ').slice(0, 1200) || null,
      finished_at: new Date().toISOString(),
    }).eq('id', runId);

    const hasMore = !requestedSessions && startIndex + sessionsToUse.length < totalWorkingSessions;
    const nextCursor = hasMore ? sessionsToUse[sessionsToUse.length - 1] : null;
    return json({
      ok: perSession.every((s: any) => s.ok),
      sessions: sessionsToUse,
      fetched: totalFetched,
      mapped: totalMapped,
      backfilled: totalBackfilled,
      centralized: totalCentralized,
      nextCursor,
      perSession,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from('waouh_lid_sync_runs').update({
      status: 'error', error: msg, finished_at: new Date().toISOString(),
    }).eq('id', runId);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeWahaPhone(value?: string | null) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Bénin: conserve le plan national actuel à 10 chiffres (01xxxxxxxx)
  // et convertit les anciens formats 8 chiffres / +229xxxxxxxx.
  if (/^22901\d{8}$/.test(digits)) return `+${digits}`;
  if (/^229\d{8}$/.test(digits)) return `+22901${digits.slice(3)}`;
  if (/^01\d{8}$/.test(digits)) return `+229${digits}`;
  if (/^\d{8}$/.test(digits)) return `+22901${digits}`;

  // WAHA renvoie généralement les numéros internationaux avec l'indicatif
  // mais sans '+'. Ne jamais leur préfixer +229.
  if (/^[1-9]\d{7,14}$/.test(digits)) return `+${digits}`;
  return null;
}

function isBjPhoneDigits(digits: string) {
  return /^22901\d{8}$/.test(digits) || /^229[4-9]\d{7}$/.test(digits) || /^01\d{8}$/.test(digits) || /^[4-9]\d{7}$/.test(digits);
}

function isLikelyPhoneDigits(digits: string) {
  return isBjPhoneDigits(digits) || (digits.length >= 8 && digits.length <= 15 && !digits.startsWith('1000'));
}

function nameKey(value?: string | null) {
  return (value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}
