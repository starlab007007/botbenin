import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireRuntimeOrAdmin } from '../_shared/waouh-runtime-auth.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Manual admin calls and trusted runtime/cron calls share the same guard.
  // The function stays verify_jwt=false because pg_cron authenticates with
  // x-waouh-internal instead of a user JWT.
  const guard = await requireRuntimeOrAdmin(req, supabase);
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const backfill = body.backfill !== false;
  const maxSessions = Math.max(1, Math.min(Number(body.maxSessions || 1), 3));
  const maxContactsPerSession = Math.max(100, Math.min(Number(body.maxContactsPerSession || 1000), 5000));
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
        sessions: [], fetched: 0, mapped: 0, backfilled: 0, perSession: [],
      });
    }

    let totalFetched = 0, totalMapped = 0, totalBackfilled = 0;
    const perSession: any[] = [];

    for (const session of sessionsToUse) {
      const sessionResult: any = { session, fetched: 0, mapped: 0, backfilled: 0, ok: false };
      try {
        const url = `${wahaBase}/api/contacts/all?session=${encodeURIComponent(session)}&limit=${maxContactsPerSession}&offset=0&sortBy=id&sortOrder=asc`;
        const resp = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });

        let contacts: WahaContact[] = [];
        let fetched = 0;

        if (resp.ok) {
          const payload = await resp.json().catch(() => []);
          const allContacts = Array.isArray(payload)
            ? payload
            : (Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.items) ? payload.items : []);
          contacts = allContacts.slice(0, maxContactsPerSession);
          fetched = allContacts.length;
        } else {
          const contactError = await resp.text().catch(() => "");
          // WAHA NOWEB may expose a WORKING session while its contact Store is
          // unavailable. The official LID API still provides LID -> PN mappings,
          // which is exactly what WAOUH needs to normalize phone destinations.
          const lidsUrl = `${wahaBase}/api/${encodeURIComponent(session)}/lids?limit=${maxContactsPerSession}&offset=0`;
          const lidsResp = await fetch(lidsUrl, { headers, signal: AbortSignal.timeout(15_000) });
          if (!lidsResp.ok) {
            const lidError = await lidsResp.text().catch(() => "");
            sessionResult.error =
              `contacts HTTP ${resp.status}: ${contactError.slice(0, 160)} | lids HTTP ${lidsResp.status}: ${lidError.slice(0, 160)}`;
            perSession.push(sessionResult);
            continue;
          }
          const lidsPayload = await lidsResp.json().catch(() => []);
          const lids = Array.isArray(lidsPayload)
            ? lidsPayload
            : (Array.isArray(lidsPayload?.data) ? lidsPayload.data : Array.isArray(lidsPayload?.items) ? lidsPayload.items : []);
          contacts = lids.slice(0, maxContactsPerSession).map((entry: any) => {
            const lidRaw = String(entry?.lid || "").replace(/@lid$/i, "");
            const pnRaw = String(entry?.pn || entry?.phone || entry?.phoneNumber || "")
              .replace(/@c\.us$/i, "")
              .replace(/@s\.whatsapp\.net$/i, "");
            return {
              id: lidRaw ? `${lidRaw}@lid` : "",
              lid: lidRaw || undefined,
              number: pnRaw || undefined,
            } as WahaContact;
          }).filter((entry: WahaContact) => !!entry.id && !!entry.number);
          fetched = contacts.length;
          sessionResult.warning = `WAHA contacts/all indisponible (${resp.status}); fallback LID→PN utilisé.`;
        }

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
              phoneRowsByName.set(key, { ...rowBase, lid: lidId || id });
            }
          }
        }


        for (const c of contacts || []) {
          const id = c.id || '';
          if (!id.endsWith('@lid')) continue;
          const lidId = c.lid || id.split('@')[0];
          const linked = phoneRowsByName.get(nameKey(c.name || c.shortName)) || phoneRowsByName.get(nameKey(c.pushname));
          if (linked && lidId) rows.push({ ...linked, lid: lidId, jid: id });
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

    const successfulSessions = perSession.filter((row: any) => row.ok === true).length;
    const failedSessions = perSession.filter((row: any) => row.ok !== true).length;
    const runStatus = successfulSessions > 0 ? 'success' : 'failed';
    const runError = successfulSessions > 0
      ? null
      : perSession.map((row: any) => row.error).filter(Boolean).join(' | ').slice(0, 1000) || 'all_sessions_failed';

    await supabase.from('waouh_lid_sync_runs').update({
      contacts_fetched: totalFetched,
      contacts_mapped: totalMapped,
      rows_backfilled: totalBackfilled,
      status: runStatus,
      error: runError,
      finished_at: new Date().toISOString(),
    }).eq('id', runId);

    const hasMore = !requestedSessions && startIndex + sessionsToUse.length < totalWorkingSessions;
    const nextCursor = hasMore ? sessionsToUse[sessionsToUse.length - 1] : null;
    return json({
      ok: successfulSessions > 0,
      sessions: sessionsToUse,
      fetched: totalFetched,
      mapped: totalMapped,
      backfilled: totalBackfilled,
      successfulSessions,
      failedSessions,
      nextCursor,
      perSession,
    }, successfulSessions > 0 ? 200 : 502);
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
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('229') && digits.length === 11) return `+22901${digits.slice(3)}`;
  return digits.startsWith('229') ? `+${digits}` : `+${digits}`;
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
