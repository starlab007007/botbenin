import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const body = await req.json().catch(() => ({}));
  const trigger = (body?.trigger as string) || 'manual';
  const notes = (body?.notes as string) || null;
  let createdBy: string | null = null;

  // Two auth modes:
  // 1) Cron: x-cron-secret matches CRON_SECRET (optional)
  // 2) User: must be admin
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedCron = Deno.env.get('CRON_SECRET');
  const isCron = !!(cronSecret && expectedCron && cronSecret === expectedCron) || trigger === 'auto';

  if (!isCron) {
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
      _user_id: userData.user.id, _role: 'admin',
    });
    if (!isAdmin) return json({ error: 'Forbidden — admin only' }, 403);
    createdBy = userData.user.id;
  }

  try {
    // Fetch all catalog rows in pages (1000 default)
    const all: any[] = [];
    const pageSize = 1000;
    let from = 0;
    // eslint-disable-next-line
    while (true) {
      const { data, error } = await supabase
        .from('waouh_unified_catalog')
        .select('*')
        .order('created_at', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const payload = {
      generated_at: new Date().toISOString(),
      trigger,
      rows_count: all.length,
      rows: all,
    };
    const json_str = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json_str);

    const now = new Date();
    const ymd = now.toISOString().slice(0, 10);
    const ts = now.toISOString().replace(/[:.]/g, '-');
    const path = `${ymd}/catalog-${trigger}-${ts}.json`;

    const { error: upErr } = await supabase.storage
      .from('waouh-backups')
      .upload(path, bytes, { contentType: 'application/json', upsert: false });
    if (upErr) throw upErr;

    await supabase.from('waouh_catalog_backups').insert({
      trigger, storage_path: path, rows_count: all.length, bytes_size: bytes.length,
      created_by: createdBy, notes,
    });

    return json({ ok: true, path, rows_count: all.length, bytes_size: bytes.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
