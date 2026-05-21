import { createClient } from 'npm:@supabase/supabase-js@2';

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

  // Auth + admin check
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json({ error: 'Unauthorized' }, 401);
  const { data: isAdmin, error: adminRoleError } = await supabase.rpc('has_role', {
    _user_id: userData.user.id,
    _role_name: 'admin',
  });
  const { data: isSuperAdmin, error: superAdminRoleError } = await supabase.rpc('has_role', {
    _user_id: userData.user.id,
    _role_name: 'super_admin',
  });
  if (adminRoleError || superAdminRoleError) {
    console.error('[waouh-waha-sync-contacts] role check failed', { adminRoleError, superAdminRoleError });
    return json({ error: 'Impossible de vérifier le rôle administrateur' }, 500);
  }
  if (!isAdmin && !isSuperAdmin) return json({ error: 'Forbidden — admin only' }, 403);

  const body = await req.json().catch(() => ({}));
  const backfill = body.backfill !== false;
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
    if (requestedSessions) {
      sessionsToUse = requestedSessions;
    } else {
      const sRes = await fetch(`${wahaBase}/api/sessions`, { headers });
      if (!sRes.ok) {
        const t = await sRes.text();
        throw new Error(`WAHA /api/sessions HTTP ${sRes.status}: ${t.slice(0, 200)}`);
      }
      const list = await sRes.json();
      sessionsToUse = (Array.isArray(list) ? list : [])
        .filter((s: any) => s?.status === 'WORKING')
        .map((s: any) => s.name)
        .filter(Boolean);

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
        const url = `${wahaBase}/api/contacts/all?session=${encodeURIComponent(session)}`;
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
          const text = await resp.text();
          sessionResult.error = `HTTP ${resp.status}: ${text.slice(0, 200)}`;
          perSession.push(sessionResult);
          continue;
        }
        const contacts: WahaContact[] = await resp.json();
        const fetched = Array.isArray(contacts) ? contacts.length : 0;
        sessionResult.fetched = fetched;
        totalFetched += fetched;

        const rows: any[] = [];
        const phoneRowsByName = new Map<string, any>();
        for (const c of contacts || []) {
          const id = c.id || '';
          const rawPhone = c.number || c.phoneNumber || (id.includes('@') ? id.split('@')[0] : '');
          const digits = (rawPhone || '').replace(/\D/g, '');
          if (!digits || !isLikelyPhoneDigits(digits)) continue;

          let phone_e164: string;
          try {
            const { data: norm } = await supabase.rpc('waouh_normalize_bj_phone', { p: digits });
            phone_e164 = (norm as string) || (digits.startsWith('229') ? `+${digits}` : `+${digits}`);
          } catch {
            phone_e164 = digits.startsWith('229') ? `+${digits}` : `+${digits}`;
          }

          const lidId = c.lid || (id.endsWith('@lid') ? id.split('@')[0] : null);
          const displayName = c.name || c.shortName || null;
          const pushname = c.pushname || null;
          const rowBase = {
            jid: id, phone: digits, phone_e164,
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
            if (key && isBjPhoneDigits(digits)) phoneRowsByName.set(key, { ...rowBase, lid: lidId || id });
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
          for (const r of finalRows) {
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
      status: 'success',
      finished_at: new Date().toISOString(),
    }).eq('id', runId);

    return json({
      ok: true,
      sessions: sessionsToUse,
      fetched: totalFetched,
      mapped: totalMapped,
      backfilled: totalBackfilled,
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
