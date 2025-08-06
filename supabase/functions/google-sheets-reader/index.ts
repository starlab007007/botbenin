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
    const { spreadsheetId, sheetName = 'Feuille 1' } = await req.json();

    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ error: 'spreadsheetId est requis' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Google Sheets API key from Supabase secrets
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_SHEETS_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuration API manquante' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Construct Google Sheets API URL
    const range = `${sheetName}!A:Z`; // Read all columns
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${GOOGLE_API_KEY}`;

    console.log('Fetching Google Sheets data from:', url);

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Sheets API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de l\'accès à Google Sheets',
          details: errorText,
          status: response.status 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const sheetsData = await response.json();
    console.log('Google Sheets response:', sheetsData);

    if (!sheetsData.values || sheetsData.values.length === 0) {
      return new Response(
        JSON.stringify({ data: [], message: 'Aucune donnée trouvée dans la feuille' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Transform the raw data into structured format
    const [headers, ...rows] = sheetsData.values;
    console.log('Headers found:', headers);
    console.log('Number of data rows:', rows.length);

    // Map headers to expected column names (case insensitive)
    const columnMapping: { [key: string]: string } = {
      'nom': 'name',
      'name': 'name',
      'prénom': 'name',
      'prenom': 'name',
      'email': 'email',
      'e-mail': 'email',
      'mail': 'email',
      'téléphone': 'phone',
      'telephone': 'phone',
      'phone': 'phone',
      'tel': 'phone',
      'entreprise': 'company',
      'company': 'company',
      'société': 'company',
      'societe': 'company',
      'poste': 'position',
      'position': 'position',
      'titre': 'position',
      'job': 'position',
      'localisation': 'location',
      'location': 'location',
      'ville': 'location',
      'adresse': 'location',
      'linkedin': 'linkedin',
      'source': 'source',
      'notes': 'notes',
      'note': 'notes',
      'commentaires': 'notes',
      'date_creation': 'created_date',
      'date_créé': 'created_date',
      'created': 'created_date',
      'date': 'created_date',
      'dernier_contact': 'last_contact',
      'last_contact': 'last_contact',
      'statut': 'status',
      'status': 'status',
      'état': 'status',
      'etat': 'status',
      'score': 'score',
      'note_score': 'score',
      'secteur': 'industry',
      'industry': 'industry',
      'industrie': 'industry',
      'site_web': 'website',
      'website': 'website',
      'site': 'website',
      'web': 'website'
    };

    // Create mapping from header indices to field names
    const fieldMapping: { [key: number]: string } = {};
    headers.forEach((header: string, index: number) => {
      const normalizedHeader = header.toLowerCase().trim();
      const fieldName = columnMapping[normalizedHeader];
      if (fieldName) {
        fieldMapping[index] = fieldName;
      }
    });

    console.log('Field mapping:', fieldMapping);

    const processedData = rows.map((row: string[], index: number) => {
      const prospect: any = {
        id: `sheet_${Date.now()}_${index}`,
        name: '',
        email: '',
        phone: '',
        company: '',
        position: '',
        location: '',
        linkedin: '',
        source: 'Google Sheets',
        notes: '',
        created_date: new Date().toISOString().split('T')[0],
        last_contact: '',
        status: 'new',
        score: Math.floor(Math.random() * 10) + 1, // Random score for demo
        industry: '',
        website: ''
      };

      // Map each cell to the appropriate field
      row.forEach((cell: string, cellIndex: number) => {
        const fieldName = fieldMapping[cellIndex];
        if (fieldName && cell && cell.trim()) {
          prospect[fieldName] = cell.trim();
        }
      });

      // Clean up and validate data
      if (prospect.name && !prospect.name.includes('@')) {
        // If name seems to be an email, try to extract actual name
        if (!prospect.email && prospect.name.includes('@')) {
          prospect.email = prospect.name;
          prospect.name = prospect.name.split('@')[0].replace(/[._]/g, ' ');
        }
      }

      // Set default values if missing
      if (!prospect.name) prospect.name = 'Nom non spécifié';
      if (!prospect.company) prospect.company = 'Entreprise non spécifiée';
      if (!prospect.position) prospect.position = 'Poste non spécifié';
      if (!prospect.status) prospect.status = 'new';
      if (!prospect.score) prospect.score = 5;

      // Validate score is a number
      if (typeof prospect.score === 'string') {
        const scoreNum = parseInt(prospect.score);
        prospect.score = isNaN(scoreNum) ? 5 : Math.max(1, Math.min(10, scoreNum));
      }

      return prospect;
    });

    // Filter out rows with no meaningful data
    const validData = processedData.filter(item => 
      item.name !== 'Nom non spécifié' || 
      item.email || 
      item.company !== 'Entreprise non spécifiée'
    );

    console.log(`Processed ${validData.length} valid prospects from ${rows.length} rows`);

    return new Response(
      JSON.stringify({ 
        data: validData,
        totalRows: rows.length,
        validRows: validData.length,
        headers: headers,
        message: `${validData.length} prospects importés avec succès` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in google-sheets-reader:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});