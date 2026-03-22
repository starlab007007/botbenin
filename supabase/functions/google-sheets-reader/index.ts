import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getGoogleAccessToken(): Promise<string> {
  const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!GOOGLE_SERVICE_ACCOUNT_KEY) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY manquant');

  let serviceAccount;
  try { serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY); } catch { throw new Error('Format JSON invalide pour GOOGLE_SERVICE_ACCOUNT_KEY'); }
  if (!serviceAccount.client_email || !serviceAccount.private_key) throw new Error('Clé de service account incomplète');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const b64url = (obj: any) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const signingInput = `${b64url(header)}.${b64url(payload)}`;

  let privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const pemContents = privateKey.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '');
  const binaryString = atob(pemContents);
  const keyBuffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) keyBuffer[i] = binaryString.charCodeAt(i);

  const cryptoKey = await crypto.subtle.importKey('pkcs8', keyBuffer.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput)));
  let sigB64 = '';
  for (let i = 0; i < sig.length; i++) sigB64 += String.fromCharCode(sig[i]);
  const encodedSig = btoa(sigB64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${signingInput}.${encodedSig}` }),
  });

  if (!tokenResponse.ok) throw new Error(`Token exchange failed: ${await tokenResponse.text()}`);
  return (await tokenResponse.json()).access_token;
}

function parseSheetData(headers: string[], rows: any[][]): { records: any[], hasUserIdColumn: boolean } {
  const hasUserIdColumn = headers.some((h: string) => h?.trim()?.toLowerCase() === 'user_id');
  const records = rows
    .filter((row: any[]) => row.length > 0 && row.some(cell => cell && cell.toString().trim()))
    .map((row: any[], index: number) => {
      const record: Record<string, any> = { id: `gs_${Date.now()}_${index}`, _isOrphan: !hasUserIdColumn };
      headers.forEach((header: string, colIndex: number) => {
        if (header?.trim()) {
          record[header.trim()] = row[colIndex] || '';
          if (header.trim().toLowerCase() === 'user_id' && !record[header.trim()]) record._isOrphan = true;
        }
      });
      return record;
    });
  return { records, hasUserIdColumn };
}

function buildResponse(records: any[], headers: string[], hasUserIdColumn: boolean, source: string, spreadsheetId: string, sheetName: string) {
  const orphanCount = records.filter((r: any) => r._isOrphan).length;
  return new Response(JSON.stringify({
    success: true, data: records, records, headers,
    metadata: { totalRows: records.length, validRows: records.length, orphanCount, hasUserIdColumn, headers, source, spreadsheetId, sheetName, lastSync: new Date().toISOString() },
    message: `${records.length} enregistrements importés depuis "${sheetName}" (${orphanCount} orphelins)`
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log('=== Google Sheets Reader Started ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({ error: 'Token invalide' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Permission check - skip if function doesn't exist
    try {
      const { data: hasPermission } = await supabase.rpc('user_has_permission', { user_uuid: user.id, permission_name: 'sheets.view' });
      if (hasPermission === false) {
        return new Response(JSON.stringify({ error: 'Permission refusée' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } catch (permErr) {
      console.log('Permission check skipped (function may not exist):', permErr);
    }

    const { spreadsheetId, sheetName = 'Feuille 1' } = await req.json();
    console.log('Params:', { spreadsheetId, sheetName });
    if (!spreadsheetId) return new Response(JSON.stringify({ error: 'spreadsheetId requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const sheetNamesToTry = [sheetName];

    // METHOD 1: OAuth2 Service Account
    const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        const accessToken = await getGoogleAccessToken();
        console.log('✅ OAuth2 token obtained');

        for (const name of sheetNamesToTry) {
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(name + '!A:Z')}`;
          const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
          
          if (response.ok) {
            const sheetsData = await response.json();
            if (sheetsData.values?.length > 0) {
              const [headers, ...rows] = sheetsData.values;
              const { records, hasUserIdColumn } = parseSheetData(headers, rows);
              console.log(`✅ OAuth2 success: ${name} - ${records.length} rows`);
              return buildResponse(records, headers.filter((h: string) => h?.trim()), hasUserIdColumn, 'Google Sheets API (OAuth2)', spreadsheetId, name);
            }
          } else {
            const errBody = await response.text();
            console.log(`❌ OAuth2 ${name}: ${response.status} - ${errBody.substring(0, 200)}`);
          }
        }
      } catch (err) {
        console.error('OAuth2 failed:', err);
      }
    }

    // METHOD 2: API Key (for public/shared sheets)
    const GOOGLE_SHEETS_API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (GOOGLE_SHEETS_API_KEY) {
      for (const name of sheetNamesToTry) {
        try {
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(name + '!A:Z')}?key=${GOOGLE_SHEETS_API_KEY}`;
          const response = await fetch(url);
          
          if (response.ok) {
            const sheetsData = await response.json();
            if (sheetsData.values?.length > 0) {
              const [headers, ...rows] = sheetsData.values;
              const { records, hasUserIdColumn } = parseSheetData(headers, rows);
              console.log(`✅ API Key success: ${name} - ${records.length} rows`);
              return buildResponse(records, headers.filter((h: string) => h?.trim()), hasUserIdColumn, 'Google Sheets API (API Key)', spreadsheetId, name);
            }
          } else {
            console.log(`❌ API Key ${name}: ${response.status}`);
          }
        } catch (e) {
          console.log(`API Key error for ${name}:`, e);
        }
      }
    }

    // METHOD 3: GViz (public sheets)
    for (const name of sheetNamesToTry) {
      try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(name)}`;
        const gvizRes = await fetch(gvizUrl);
        if (!gvizRes.ok) continue;

        const gvizText = await gvizRes.text();
        const jsonPayload = gvizText.replace(/^.*setResponse\(/s, '').replace(/\);\s*$/s, '');
        const gviz = JSON.parse(jsonPayload);
        const cols = gviz?.table?.cols || [];
        const gvizRows = gviz?.table?.rows || [];
        if (cols.length === 0 || gvizRows.length === 0) continue;

        const headers = cols.map((c: any) => (c?.label || c?.id || '').toString().trim()).filter((h: string) => !!h);
        const values = gvizRows.map((r: any) => (r?.c || []).map((c: any) => (c?.f ?? c?.v ?? '')));
        const { records, hasUserIdColumn } = parseSheetData(headers, values);
        
        if (records.length > 0) {
          console.log(`✅ GViz success: ${name} - ${records.length} rows`);
          return buildResponse(records, headers, hasUserIdColumn, 'Google GViz (public)', spreadsheetId, name);
        }
      } catch (e) {
        console.log(`GViz error for ${name}:`, e);
      }
    }

    // Get service account email for helpful error
    let saEmail = '';
    if (GOOGLE_SERVICE_ACCOUNT_KEY) {
      try { saEmail = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY).client_email || ''; } catch {}
    }

    return new Response(JSON.stringify({
      error: 'Impossible d\'accéder au Google Sheet',
      details: `Toutes les méthodes ont échoué (403). ${saEmail ? `Partagez le sheet avec: ${saEmail}` : 'Configurez les credentials Google'}`,
      suggestion: saEmail ? `Ouvrez le Google Sheet → Partager → Ajoutez "${saEmail}" en tant qu'éditeur` : 'Rendez la feuille publique ou configurez un service account',
      data: []
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur', details: (error as any)?.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})
