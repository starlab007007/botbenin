import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fonction pour obtenir un token d'accès OAuth2 avec service account
async function getGoogleAccessToken(): Promise<string> {
  const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  
  if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY manquant');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
  } catch (parseError) {
    throw new Error('Format JSON invalide pour GOOGLE_SERVICE_ACCOUNT_KEY');
  }

  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Clé de service account incomplète');
  }
  
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const base64UrlEncode = (obj: any): string => {
    const jsonStr = JSON.stringify(obj);
    const base64 = btoa(jsonStr);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  let privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Format de clé privée invalide');
  }

  try {
    const pemContents = privateKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s+/g, '');

    const binaryString = atob(pemContents);
    const keyBuffer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      keyBuffer[i] = binaryString.charCodeAt(i);
    }

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signingInput)
    );

    const signatureArray = new Uint8Array(signatureBuffer);
    let signatureBase64 = '';
    for (let i = 0; i < signatureArray.length; i++) {
      signatureBase64 += String.fromCharCode(signatureArray[i]);
    }
    const encodedSignature = btoa(signatureBase64)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const jwt = `${signingInput}.${encodedSignature}`;
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
    
  } catch (keyError) {
    throw new Error(`Erreur d'authentification: ${keyError.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Google Sheets Reader Function Started ===');
    
    const { spreadsheetId, sheetName = 'Feuille 1' } = await req.json();
    console.log('Request params:', { spreadsheetId, sheetName });

    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ error: 'spreadsheetId est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for service account credentials
    const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    console.log('Service Account Key present:', !!GOOGLE_SERVICE_ACCOUNT_KEY);

    // Try authenticated access first if credentials available
    if (GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        const accessToken = await getGoogleAccessToken();
        console.log('OAuth2 token obtained successfully');
        
        const sheetNamesToTry = [
          sheetName,
          `'${sheetName}'`,
          `"${sheetName}"`,
          sheetName.replace(/\s+/g, ''),
          'Sheet1',
          'Feuille1',
          'Class Data'
        ];
        
        for (const currentSheetName of sheetNamesToTry) {
          try {
            console.log(`Tentative avec feuille: "${currentSheetName}"`);
            
            const range = `${currentSheetName}!A:Z`;
            const encodedRange = encodeURIComponent(range);
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;
            
            const response = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const sheetsData = await response.json();
              console.log(`✅ Succès avec "${currentSheetName}": ${sheetsData.values?.length || 0} lignes`);
              
              if (sheetsData.values && sheetsData.values.length > 0) {
                const [headers, ...rows] = sheetsData.values;
                
                const hasUserIdColumn = headers.some((h: string) => h?.trim()?.toLowerCase() === 'user_id');
                console.log('Colonne user_id trouvée:', hasUserIdColumn);
                
                const dynamicRecords = rows
                  .filter((row: any[]) => row.length > 0 && row.some(cell => cell && cell.toString().trim()))
                  .map((row: any[], index: number) => {
                    const record: Record<string, any> = { 
                      id: `gs_${Date.now()}_${index}`,
                      _isOrphan: !hasUserIdColumn
                    };
                    headers.forEach((header: string, colIndex: number) => {
                      if (header && header.trim()) {
                        const headerName = header.trim();
                        record[headerName] = row[colIndex] || '';
                        if (headerName.toLowerCase() === 'user_id' && !record[headerName]) {
                          record._isOrphan = true;
                        }
                      }
                    });
                    return record;
                  });

                const orphanCount = dynamicRecords.filter(r => r._isOrphan).length;
                
                return new Response(
                  JSON.stringify({ 
                    success: true,
                    data: dynamicRecords,
                    records: dynamicRecords,
                    headers: headers.filter((h: string) => h && h.trim()),
                    metadata: {
                      totalRows: rows.length,
                      validRows: dynamicRecords.length,
                      orphanCount: orphanCount,
                      hasUserIdColumn: hasUserIdColumn,
                      headers: headers.filter((h: string) => h && h.trim()),
                      source: 'Google Sheets API (OAuth2)',
                      spreadsheetId: spreadsheetId,
                      sheetName: currentSheetName,
                      lastSync: new Date().toISOString()
                    },
                    message: `${dynamicRecords.length} enregistrements importés depuis "${currentSheetName}" (${orphanCount} orphelins)`
                  }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            } else {
              const errorText = await response.text();
              console.log(`❌ Échec avec "${currentSheetName}": ${response.status}`);
            }
          } catch (err) {
            console.log(`Exception pour "${currentSheetName}":`, err);
          }
        }
      } catch (authError) {
        console.error('OAuth2 authentication failed:', authError);
        // Continue to fallback methods
      }
    }

    // Fallback to public access methods (GViz)
    try {
      console.log('🔄 Utilisation des méthodes publiques (GViz)...');
      const sheetNamesToTry = [sheetName, 'Sheet1', 'Feuille1', 'Class Data'];

      for (const currentSheetName of sheetNamesToTry) {
        try {
          console.log(`GViz fallback pour: "${currentSheetName}"`);
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(currentSheetName)}`;
          const gvizRes = await fetch(gvizUrl);
          
          if (!gvizRes.ok) continue;
          
          const gvizText = await gvizRes.text();
          const jsonPayload = gvizText.replace(/^.*setResponse\(/s, '').replace(/\);\s*$/s, '');
          const gviz = JSON.parse(jsonPayload);
          const cols = gviz?.table?.cols || [];
          const rows = gviz?.table?.rows || [];
          
          if (cols.length === 0 || rows.length === 0) continue;

          const headers = cols.map((c: any) => (c?.label || c?.id || '').toString().trim()).filter((h: string) => !!h);
          const values = rows.map((r: any) => (r?.c || []).map((c: any) => (c?.f ?? c?.v ?? '')));
          
          const hasUserIdColumn = headers.some((h: string) => h?.trim()?.toLowerCase() === 'user_id');
          console.log('GViz - Colonne user_id trouvée:', hasUserIdColumn);

          const dynamicRecords = values
            .filter((row: any[]) => row.some(cell => (cell ?? '').toString().trim() !== ''))
            .map((row: any[], idx: number) => {
              const rec: Record<string, any> = { 
                id: `gs_${Date.now()}_${idx}`,
                _isOrphan: !hasUserIdColumn
              };
              headers.forEach((h: string, i: number) => { 
                rec[h] = row[i] ?? '';
                if (h.toLowerCase() === 'user_id' && !rec[h]) {
                  rec._isOrphan = true;
                }
              });
              return rec;
            });

          if (dynamicRecords.length > 0) {
            const orphanCount = dynamicRecords.filter(r => r._isOrphan).length;
            return new Response(
              JSON.stringify({
                success: true,
                data: dynamicRecords,
                records: dynamicRecords,
                headers,
                metadata: {
                  totalRows: values.length,
                  validRows: dynamicRecords.length,
                  orphanCount: orphanCount,
                  hasUserIdColumn: hasUserIdColumn,
                  headers,
                  source: 'Google GViz (public)',
                  spreadsheetId,
                  sheetName: currentSheetName,
                  lastSync: new Date().toISOString()
                },
                message: `${dynamicRecords.length} enregistrements importés via GViz (${orphanCount} orphelins)`
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (e) {
          console.log('GViz parse error:', e);
          continue;
        }
      }
    } catch (fallbackError) {
      console.log('Fallback methods failed:', fallbackError);
    }

    // Si tout échoue, retourner une erreur
    return new Response(
      JSON.stringify({
        error: 'Impossible d\'accéder au Google Sheet',
        details: 'Vérifiez que le sheet est public ou configurez les credentials Google',
        suggestion: 'Rendez la feuille publique: Fichier > Partager > Publier sur le web',
        data: []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in google-sheets-reader:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
        details: (error as any)?.message || 'Erreur interne'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})