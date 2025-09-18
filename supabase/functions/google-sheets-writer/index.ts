import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create } from "https://deno.land/x/djwt@v3.0.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fonction pour générer un token d'accès OAuth2 avec un service account
async function getGoogleAccessToken(): Promise<string> {
  const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  
  if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY manquant');
  }

  const serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
  
  // Créer le JWT pour l'authentification
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const key = await crypto.subtle.importKey(
    'pkcs8',
    new TextEncoder().encode(serviceAccount.private_key.replace(/\\n/g, '\n')),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const jwt = await create({ alg: 'RS256', typ: 'JWT' }, payload, key);
  
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
    throw new Error(`Échec de l'authentification Google: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Google Sheets Writer Function Started ===');
    
    const { spreadsheetId, sheetName = 'Feuille 1', data, operation = 'append' } = await req.json();
    console.log('Request params:', { spreadsheetId, sheetName, operation, dataLength: data?.length });

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
      // Prepare data for Google Sheets
      const headers = ['Nom du Contact', 'Nom de l\'Entreprise', 'Site Web Entreprise', 'Rôle / Poste', 'Profil LinkedIn', 'Statut', 'Notes/Pertinence'];
      
      // Convert prospect data to rows
      const rows = data.map(prospect => [
        prospect.contactName || '',
        prospect.companyName || '',
        prospect.companyWebsite || '',
        prospect.role || '',
        prospect.linkedinUrl || '',
        prospect.status || 'pending',
        prospect.relevance || ''
      ]);

      let range = `${sheetName}!A:G`;
      let valueInputOption = 'USER_ENTERED';
      let values: string[][] = [];

      if (operation === 'overwrite') {
        // Clear sheet and write headers + data
        values = [headers, ...rows];
        
        // First clear the sheet
        const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
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
      } else {
        // Append mode - just add data rows
        values = rows;
        range = `${sheetName}!A:G`;
      }

      // Write data to Google Sheets
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}`;
      
      const requestBody = {
        values: values
      };

      console.log('Writing to Google Sheets:', { url, requestBody });

      const response = await fetch(url, {
        method: operation === 'append' ? 'POST' : 'PUT',
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