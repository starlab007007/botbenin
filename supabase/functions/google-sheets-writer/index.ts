import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Check for Google API key
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    console.log('API Key present:', !!GOOGLE_API_KEY);

    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Clé API Google manquante',
          details: 'La clé API Google Sheets n\'est pas configurée',
          suggestion: 'Configurez votre clé API Google Sheets dans les secrets Supabase'
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
        const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear?key=${GOOGLE_API_KEY}`;
        const clearResponse = await fetch(clearUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}&key=${GOOGLE_API_KEY}`;
      
      const requestBody = {
        values: values
      };

      console.log('Writing to Google Sheets:', { url, requestBody });

      const response = await fetch(url, {
        method: operation === 'append' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
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