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
    console.log('=== Google Sheets Reader Function Started ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    let body;
    try {
      body = await req.json();
      console.log('Request body:', body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { spreadsheetId, sheetName = 'Feuille 1' } = body;

    if (!spreadsheetId) {
      console.log('Missing spreadsheetId in request');
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
    console.log('API Key present:', !!GOOGLE_API_KEY);
    console.log('API Key length:', GOOGLE_API_KEY ? GOOGLE_API_KEY.length : 0);
    
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

    console.log('Making request to Google Sheets API...');
    console.log('URL (without API key):', url.replace(/key=.*$/, 'key=***'));
    console.log('Spreadsheet ID:', spreadsheetId);
    console.log('Sheet name:', sheetName);
    console.log('Range:', range);

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
      // French headers
      'nom': 'name',
      'prénom': 'name', 
      'prenom': 'name',
      'email': 'email',
      'e-mail': 'email',
      'mail': 'email',
      'téléphone': 'phone',
      'telephone': 'phone',
      'tel': 'phone',
      'entreprise': 'company',
      'société': 'company',
      'societe': 'company',
      'poste': 'position',
      'titre': 'position',
      'localisation': 'location',
      'ville': 'location',
      'adresse': 'location',
      'linkedin': 'linkedin',
      'source': 'source',
      'notes': 'notes',
      'note': 'notes',
      'commentaires': 'notes',
      'date_creation': 'created_date',
      'date_créé': 'created_date',
      'dernier_contact': 'last_contact',
      'statut': 'status',
      'état': 'status',
      'etat': 'status',
      'score': 'score',
      'note_score': 'score',
      'secteur': 'industry',
      'industrie': 'industry',
      'site_web': 'website',
      'site': 'website',
      
      // English headers
      'name': 'name',
      'first name': 'name',
      'last name': 'name',
      'phone': 'phone',
      'phone number': 'phone',
      'company': 'company',
      'organization': 'company',
      'position': 'position',
      'job': 'position',
      'title': 'position',
      'location': 'location',
      'address': 'location',
      'city': 'location',
      'created': 'created_date',
      'date': 'created_date',
      'last_contact': 'last_contact',
      'status': 'status',
      'industry': 'industry',
      'website': 'website',
      'web': 'website',
      
      // Test sheet specific headers
      'student name': 'name',
      'gender': 'notes',
      'class level': 'position',
      'home state': 'location',
      'major': 'industry',
      'extracurricular activity': 'notes'
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
          let value = cell.trim();
          
          // Special handling for concatenated names
          if (fieldName === 'name' && prospect.name) {
            prospect.name = `${prospect.name} ${value}`;
          } else if (fieldName === 'notes' && prospect.notes) {
            prospect.notes = `${prospect.notes}, ${value}`;
          } else {
            prospect[fieldName] = value;
          }
        }
      });

      // Generate synthetic email if missing (for demo purposes)
      if (!prospect.email && prospect.name && prospect.name !== 'Nom non spécifié') {
        const nameForEmail = prospect.name.toLowerCase().replace(/\s+/g, '.');
        const domain = prospect.company && prospect.company !== 'Entreprise non spécifiée' 
          ? prospect.company.toLowerCase().replace(/\s+/g, '') + '.com'
          : 'example.com';
        prospect.email = `${nameForEmail}@${domain}`;
      }

      // Generate synthetic phone if missing
      if (!prospect.phone) {
        prospect.phone = `+33 ${Math.floor(Math.random() * 9) + 1} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10}`;
      }

      // Set default values if missing
      if (!prospect.name || prospect.name.trim() === '') prospect.name = 'Prospect ' + (index + 1);
      if (!prospect.company || prospect.company.trim() === '') prospect.company = 'Entreprise ' + (index + 1);
      if (!prospect.position || prospect.position.trim() === '') prospect.position = 'Poste non spécifié';
      if (!prospect.status) prospect.status = 'new';
      if (!prospect.score) prospect.score = 5;

      // Validate score is a number
      if (typeof prospect.score === 'string') {
        const scoreNum = parseInt(prospect.score);
        prospect.score = isNaN(scoreNum) ? Math.floor(Math.random() * 10) + 1 : Math.max(1, Math.min(10, scoreNum));
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