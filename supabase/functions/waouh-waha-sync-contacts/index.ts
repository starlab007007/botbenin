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
  const { data: isAdmin } = await supabase.rpc('has_role', {
    _user_id: userData.user.id,
    _role: 'admin',
  });
  if (!isAdmin) return json({ error: 'Forbidden — admin only' }, 403);

  const body = await req.json().catch(() => ({}));
  const session = body.session || 'default';
  const backfill = body.backfill !== false;

  const runRes = await supabase
    .from('waouh_lid_sync_runs')
    .insert({ session, status: 'running' })
    .select('id')
    .single();
  const runId = runRes.data?.id;

  try {
    const wahaBase = (Deno.env.get('WAHA_BASE_URL') || 'https://waha.bot.bj').replace(/\/$/, '');
    const wahaUser = Deno.env.get('WAHA_USERNAME');
    const wahaPass = Deno.env.get('WAHA_PASSWORD');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (wahaApiKey) headers['X-Api-Key'] = wahaApiKey;
    if (wahaUser && wahaPass) {
      headers['Authorization'] = 'Basic ' + btoa(`${wahaUser}:${wahaPass}`);
    }

    const url = `${wahaBase}/api/contacts/all?session=${encodeURIComponent(session)}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`WAHA ${resp.status}: ${text.slice(0, 200)}`);
    }
    const contacts: WahaContact[] = await resp.json();
    const fetched = Array.isArray(contacts) ? contacts.length : 0;

    // Build rows: pair lid with real phone where possible
    const rows: any[] = [];
    for (const c of contacts || []) {
      const id = c.id || '';
      const rawPhone = c.number || c.phoneNumber || (id.includes('@') ? id.split('@')[0] : '');
      const digits = (rawPhone || '').replace(/\D/g, '');
      if (!digits) continue;

      // Resolve E.164 via DB helper
      const { data: norm } = await supabase.rpc('waouh_normalize_bj_phone', { p: digits });
      const phone_e164 = (norm as string) || (digits.startsWith('229') ? `+${digits}` : `+${digits}`);

      const lidId = c.lid || (id.endsWith('@lid') ? id.split('@')[0] : null);
      if (lidId) {
        rows.push({
          lid: lidId,
          jid: id,
          phone: digits,
          phone_e164,
          pushname: c.pushname || null,
          display_name: c.name || c.shortName || null,
          session,
          last_synced_at: new Date().toISOString(),
        });
      }
      // Also index the JID itself (some WAHA versions only return @c.us)
      if (id && !id.endsWith('@lid')) {
        rows.push({
          lid: id, // store the full jid as key
          jid: id,
          phone: digits,
          phone_e164,
          pushname: c.pushname || null,
          display_name: c.name || c.shortName || null,
          session,
          last_synced_at: new Date().toISOString(),
        });
      }
    }

    let mapped = 0;
    // Batch upsert
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase
        .from('waouh_lid_phone_map')
        .upsert(chunk, { onConflict: 'lid' });
      if (error) throw error;
      mapped += chunk.length;
    }

    // Backfill catalogue: pour chaque mapping, mettre à jour les lignes dont vendeur_phone/whatsapp == lid@lid
    let backfilled = 0;
    if (backfill && rows.length) {
      for (const r of rows) {
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
        backfilled += (upd1?.length || 0) + (upd2?.length || 0);
      }
    }

    await supabase.from('waouh_lid_sync_runs').update({
      contacts_fetched: fetched,
      contacts_mapped: mapped,
      rows_backfilled: backfilled,
      status: 'success',
      finished_at: new Date().toISOString(),
    }).eq('id', runId);

    return json({ ok: true, session, fetched, mapped, backfilled });
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
