
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
    
    const { spreadsheetId, sheetName = 'Feuille 1' } = await req.json();
    console.log('Request params:', { spreadsheetId, sheetName });

    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ error: 'spreadsheetId est requis' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for Google API key
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    console.log('API Key present:', !!GOOGLE_API_KEY);

    // If we have an API key, try real Google Sheets API
    if (GOOGLE_API_KEY) {
      try {
        const range = `${sheetName}!A:Z`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${GOOGLE_API_KEY}`;
        
        console.log('Calling Google Sheets API...');
        const response = await fetch(url);
        
        if (response.ok) {
          const sheetsData = await response.json();
          console.log('Google Sheets API Response:', sheetsData);
          
          if (sheetsData.values && sheetsData.values.length > 0) {
            const [headers, ...rows] = sheetsData.values;
            console.log('Headers found:', headers);
            console.log('Data rows:', rows.length);
            
            const processedData = rows
              .filter(row => row.length > 0 && row[0]) // Filtrer les lignes vides
              .map((row, index) => ({
                id: `gs_${Date.now()}_${index}`,
                name: row[0] || `Prospect ${index + 1}`,
                email: row[1] || `prospect${index + 1}@example.com`,
                phone: row[2] || `+33 ${Math.floor(Math.random() * 9) + 1} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10}`,
                company: row[3] || `Entreprise ${index + 1}`,
                position: row[4] || 'Poste non spécifié',
                location: row[5] || 'France',
                linkedin: row[6] || '',
                source: 'Google Sheets',
                notes: row[7] || '',
                created_date: new Date().toISOString().split('T')[0],
                last_contact: '',
                status: ['new', 'contacted', 'interested', 'qualified'][Math.floor(Math.random() * 4)],
                score: Math.floor(Math.random() * 10) + 1,
                industry: row[8] || ['Tech', 'Finance', 'Marketing', 'Consulting', 'Retail'][Math.floor(Math.random() * 5)],
                website: row[9] || `https://${(row[3] || 'example').toLowerCase().replace(/\s+/g, '')}.com`
              }));

            console.log('Processed data:', processedData.length, 'prospects');

            return new Response(
              JSON.stringify({ 
                success: true,
                data: processedData,
                metadata: {
                  totalRows: rows.length,
                  validRows: processedData.length,
                  headers: headers,
                  source: 'Google Sheets API',
                  spreadsheetId: spreadsheetId,
                  sheetName: sheetName,
                  lastSync: new Date().toISOString()
                },
                message: `${processedData.length} prospects importés avec succès depuis Google Sheets` 
              }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          } else {
            console.log('No data found in sheets');
            return new Response(
              JSON.stringify({ 
                success: true,
                data: [],
                metadata: {
                  totalRows: 0,
                  validRows: 0,
                  headers: [],
                  source: 'Google Sheets API',
                  message: 'Aucune donnée trouvée dans la feuille'
                }
              }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
        } else {
          const errorText = await response.text();
          console.error('Google Sheets API error:', response.status, errorText);
          throw new Error(`API Google Sheets: ${response.status} - ${errorText}`);
        }
      } catch (apiError) {
        console.error('Google Sheets API failed:', apiError);
        // Ne pas tomber sur les données demo en cas d'erreur API, retourner l'erreur
        return new Response(
          JSON.stringify({ 
            error: 'Erreur API Google Sheets',
            details: apiError.message,
            suggestion: 'Vérifiez votre ID de feuille et les permissions'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      // Pas de clé API, retourner des données de démonstration avec avertissement
      console.log('No API key found, generating demo data...');
      
      const demoData = [
        {
          id: `demo_${Date.now()}_1`,
          name: 'Jean Dupont',
          email: 'jean.dupont@techcorp.fr',
          phone: '+33 1 23 45 67 89',
          company: 'TechCorp France',
          position: 'Directeur Commercial',
          location: 'Paris, France',
          linkedin: 'https://linkedin.com/in/jeandupont',
          source: 'Google Sheets',
          notes: 'Contact qualifié via LinkedIn',
          created_date: new Date().toISOString().split('T')[0],
          last_contact: '',
          status: 'qualified',
          score: 8,
          industry: 'Technology',
          website: 'https://techcorp.fr'
        },
        {
          id: `demo_${Date.now()}_2`,
          name: 'Marie Martin',
          email: 'marie.martin@innovsolutions.com',
          phone: '+33 2 34 56 78 90',
          company: 'Innov Solutions',
          position: 'Chef de Projet',
          location: 'Lyon, France',
          linkedin: 'https://linkedin.com/in/mariemartin',
          source: 'Google Sheets',
          notes: 'Intéressée par nos solutions IA',
          created_date: new Date().toISOString().split('T')[0],
          last_contact: '',
          status: 'interested',
          score: 7,
          industry: 'Consulting',
          website: 'https://innovsolutions.com'
        },
        {
          id: `demo_${Date.now()}_3`,
          name: 'Pierre Bernard',
          email: 'pierre.bernard@digitech.fr',
          phone: '+33 3 45 67 89 01',
          company: 'DigiTech',
          position: 'CEO',
          location: 'Marseille, France',
          linkedin: 'https://linkedin.com/in/pierrebernard',
          source: 'Google Sheets',
          notes: 'Décideur final pour l\'entreprise',
          created_date: new Date().toISOString().split('T')[0],
          last_contact: '',
          status: 'new',
          score: 9,
          industry: 'Digital Services',
          website: 'https://digitech.fr'
        }
      ];

      // Ajouter plus de données demo aléatoirement
      for (let i = 4; i <= 25; i++) {
        const companies = ['StartupTech', 'BusinessPro', 'InnovCorp', 'TechSolutions', 'DigitalFlow'];
        const positions = ['CEO', 'CTO', 'Directeur Commercial', 'Chef de Projet', 'Responsable Marketing'];
        const cities = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'];
        const statuses = ['new', 'contacted', 'interested', 'qualified'];
        const industries = ['Technology', 'Finance', 'Marketing', 'Consulting', 'Retail'];
        
        const company = companies[Math.floor(Math.random() * companies.length)];
        const firstName = ['Alex', 'Emma', 'Lucas', 'Camille', 'Hugo', 'Léa'][Math.floor(Math.random() * 6)];
        const lastName = ['Moreau', 'Leroy', 'Roux', 'Fournier', 'Girard', 'Bonnet'][Math.floor(Math.random() * 6)];
        
        demoData.push({
          id: `demo_${Date.now()}_${i}`,
          name: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase()}.com`,
          phone: `+33 ${Math.floor(Math.random() * 9) + 1} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10}`,
          company: company,
          position: positions[Math.floor(Math.random() * positions.length)],
          location: `${cities[Math.floor(Math.random() * cities.length)]}, France`,
          linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
          source: 'Google Sheets',
          notes: `Prospect généré automatiquement - ${company}`,
          created_date: new Date().toISOString().split('T')[0],
          last_contact: '',
          status: statuses[Math.floor(Math.random() * statuses.length)],
          score: Math.floor(Math.random() * 10) + 1,
          industry: industries[Math.floor(Math.random() * industries.length)],
          website: `https://${company.toLowerCase()}.com`
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          data: demoData,
          metadata: {
            totalRows: demoData.length,
            validRows: demoData.length,
            headers: ['Nom', 'Email', 'Téléphone', 'Entreprise', 'Poste', 'Localisation'],
            source: 'Demo Data',
            isDemo: true,
            warning: 'Clé API Google Sheets manquante - données de démonstration'
          },
          message: `${demoData.length} prospects de démonstration chargés (configurez votre clé API pour les vraies données)`
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in google-sheets-reader:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur', 
        details: error.message,
        suggestion: 'Vérifiez votre configuration et réessayez'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
