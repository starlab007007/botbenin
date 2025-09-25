import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fonction simplifiée pour générer un token d'accès Google avec JWT manuel
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
    throw new Error('Clé de service account incomplète - client_email ou private_key manquant');
  }
  
  // Créer le JWT manuellement
  const now = Math.floor(Date.now() / 1000);
  
  // Header JWT
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  // Payload JWT  
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  // Encoder en base64url
  const base64UrlEncode = (obj: any): string => {
    const jsonStr = JSON.stringify(obj);
    const base64 = btoa(jsonStr);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Nettoyer la clé privée
  let privateKey = serviceAccount.private_key;
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  // Vérifier le format PEM
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Format de clé privée invalide - doit être au format PEM PKCS#8');
  }

  try {
    // Méthode alternative : utiliser Web Crypto API de manière plus robuste
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = privateKey
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s+/g, '');

    // Décoder le base64 en tant qu'ArrayBuffer
    const binaryString = atob(pemContents);
    const keyBuffer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      keyBuffer[i] = binaryString.charCodeAt(i);
    }

    // Importer la clé avec Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer.buffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    // Signer le JWT
    const signatureBuffer = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signingInput)
    );

    // Convertir la signature en base64url
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
    
    // Échanger le JWT contre un token d'accès
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      throw new Error(`Échec de l'authentification Google: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('Token d\'accès non reçu de Google');
    }
    
    return tokenData.access_token;
    
  } catch (keyError) {
    console.error('Erreur détaillée d\'authentification:', keyError);
    throw new Error(`Erreur d'authentification Google: ${keyError.message}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Google Sheets Writer Function Started ===');
    
    const { spreadsheetId, sheetName = 'Feuille 1', data, operation = 'append', userId } = await req.json();
    console.log('Request params:', { spreadsheetId, sheetName, operation, dataLength: data?.length, userId: userId?.substring(0, 8) + '...' });

    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ error: 'spreadsheetId est requis' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!data || !Array.isArray(data)) {
      return new Response(
        JSON.stringify({ error: 'data doit être un tableau' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Obtenir le token d'accès OAuth2 
    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken();
      console.log('Access token obtenu avec succès');
    } catch (authError) {
      console.error('Erreur d\'authentification:', authError);
      return new Response(
        JSON.stringify({
          error: 'Échec de l\'authentification Google',
          details: (authError as any)?.message || 'Service account non configuré',
          suggestion: 'Configurez votre clé de service account Google dans les secrets Supabase'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    try {
      // Prepare data for Google Sheets - Dynamic columns approach
      if (data.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'Aucune donnée à écrire',
            details: 'Le tableau de données est vide'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Extract headers from first row - TOUJOURS inclure user_id pour la sécurité
      const firstRow = data[0];
      const systemFields = ['id']; // Garder user_id pour la synchronisation
      let headers = Object.keys(firstRow).filter(key => !systemFields.includes(key));
      
      // S'assurer que user_id est toujours en première position si présent
      if (headers.includes('user_id')) {
        headers = ['user_id', ...headers.filter(h => h !== 'user_id')];
      } else if (userId) {
        // Ajouter user_id si pas présent mais userId fourni
        headers = ['user_id', ...headers];
      }
      
      // Convert data to rows using dynamic headers - Forcer user_id
      const rows = data.map(item => 
        headers.map(header => {
          if (header === 'user_id') {
            return String(item[header] || userId || 'unknown');
          }
          return String(item[header] || '');
        })
      );

      console.log('Dynamic headers:', headers);
      console.log('Sample row:', rows[0]);

      // Construire le range de manière plus robuste
      const maxColumn = String.fromCharCode(65 + Math.max(headers.length - 1, 10)); // Au moins jusqu'à K
      let range = `${sheetName}!A:${maxColumn}`;
      let values: string[][] = [];

      if (operation === 'overwrite') {
        // Clear sheet and write headers + data
        values = [headers, ...rows];
        
        // First clear the sheet - utiliser un range plus simple
        const clearRange = `${sheetName}!A:Z`; // Range fixe pour éviter les problèmes
        const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`;
        
        console.log('Clearing sheet with URL:', clearUrl);
        
        const clearResponse = await fetch(clearUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          }
        });

        if (!clearResponse.ok) {
          const clearError = await clearResponse.text();
          console.error('Clear failed:', clearError);
          return new Response(
            JSON.stringify({
              error: 'Échec de l\'effacement de la feuille',
              details: clearError
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Pour overwrite, utiliser PUT avec un range spécifique
        range = `${sheetName}!A1:${maxColumn}${values.length}`;
      } else {
        // Append mode - utiliser l'API append au lieu de POST sur un range
        values = rows;
      }

      let url: string;
      let method: string;
      
      if (operation === 'append') {
        // Utiliser l'API append qui gère automatiquement les ranges
        url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
        method = 'POST';
      } else {
        // Utiliser PUT pour overwrite
        url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
        method = 'PUT';
      }
      
      const requestBody = {
        values: values
      };

      console.log('Writing to Google Sheets:', { 
        url, 
        method,
        operation,
        rowCount: values.length,
        sampleRow: values[0]?.slice(0, 3) // Juste les 3 premiers éléments pour debug
      });

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Sheets API error:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          return new Response(
            JSON.stringify({
              error: 'Erreur Google Sheets API',
              details: errorData.error?.message || errorText,
              suggestion: 'Vérifiez que la feuille existe et que vous avez les permissions d\'écriture'
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        } catch (e) {
          return new Response(
            JSON.stringify({
              error: `Erreur HTTP ${response.status}`,
              details: errorText
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      const result = await response.json();
      console.log('Write successful:', result);

      return new Response(
        JSON.stringify({
          success: true,
          updatedRows: result.updatedRows || rows.length,
          updatedRange: result.updatedRange || range,
          operation: operation,
          message: `${rows.length} prospects ${operation === 'append' ? 'ajoutés' : 'synchronisés'} avec succès vers Google Sheets`,
          metadata: {
            spreadsheetId: spreadsheetId,
            sheetName: sheetName,
            operation: operation,
            rowsWritten: rows.length,
            lastSync: new Date().toISOString()
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (apiError) {
      console.error('Google Sheets write failed:', apiError);
      return new Response(
        JSON.stringify({
          error: 'Échec de l\'écriture vers Google Sheets',
          details: (apiError as any)?.message || 'Erreur inconnue lors de l\'écriture',
          suggestion: 'Vérifiez votre connexion et les permissions de la feuille'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in google-sheets-writer:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
        details: (error as any)?.message || 'Erreur interne du serveur'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})