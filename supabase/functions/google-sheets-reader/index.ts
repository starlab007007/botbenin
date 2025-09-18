
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
      // Essayer différents formats de noms de feuilles
      const sheetNamesToTry = [
        sheetName, // Nom original
        `'${sheetName}'`, // Avec guillemets simples
        `"${sheetName}"`, // Avec guillemets doubles
        sheetName.replace(/\s+/g, ''), // Sans espaces
        'Sheet1', // Nom par défaut
        'Feuille1', // Nom français par défaut  
        'Class Data' // Nom de la feuille de test
      ];
      
      let lastError = null;
      let successData = null;
      
      for (const currentSheetName of sheetNamesToTry) {
        try {
          console.log(`Tentative avec nom de feuille: "${currentSheetName}"`);
          
          // Construire la plage avec encoding approprié
          const range = `${currentSheetName}!A:Z`;
          const encodedRange = encodeURIComponent(range);
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${GOOGLE_API_KEY}`;
          
          console.log(`URL API: ${url}`);
          const response = await fetch(url);
          
          if (response.ok) {
            const sheetsData = await response.json();
            console.log(`✅ Succès avec "${currentSheetName}"! Données:`, sheetsData);
            
            if (sheetsData.values && sheetsData.values.length > 0) {
              successData = { sheetsData, currentSheetName };
              break;
            } else {
              console.log(`Feuille "${currentSheetName}" trouvée mais vide`);
              lastError = new Error(`La feuille "${currentSheetName}" ne contient pas de données`);
            }
          } else {
            const errorText = await response.text();
            console.log(`❌ Échec avec "${currentSheetName}": ${response.status} - ${errorText}`);
            
            try {
              const errorData = JSON.parse(errorText);
              if (errorData.error?.message?.includes('Unable to parse range')) {
                lastError = new Error(`Format de nom de feuille invalide: "${currentSheetName}"`);
              } else if (errorData.error?.message?.includes('not found')) {
                lastError = new Error(`Feuille "${currentSheetName}" non trouvée`);
              } else {
                lastError = new Error(`Erreur API: ${errorData.error?.message || errorText}`);
              }
            } catch (e) {
              lastError = new Error(`Erreur HTTP ${response.status}: ${errorText}`);
            }
          }
        } catch (err) {
          console.log(`Exception pour "${currentSheetName}":`, err);
          lastError = err;
        }
      }
      
        if (successData) {
        const { sheetsData, currentSheetName } = successData;
        const [headers, ...rows] = sheetsData.values;
        console.log('Headers found:', headers);
        console.log('Data rows:', rows.length);
        
        // Créer les enregistrements dynamiques basés sur les entêtes réelles
        const hasUserIdColumn = headers.some((h: string) => h?.trim()?.toLowerCase() === 'user_id');
        console.log('Colonne user_id trouvée:', hasUserIdColumn);
        
        const dynamicRecords = rows
          .filter(row => row.length > 0 && row.some(cell => cell && cell.toString().trim()))
          .map((row, index) => {
            const record: Record<string, any> = { 
              id: `gs_${Date.now()}_${index}`,
              _isOrphan: !hasUserIdColumn // Marquer comme orphelin si pas de colonne user_id
            };
            headers.forEach((header: string, colIndex: number) => {
              if (header && header.trim()) {
                const headerName = header.trim();
                record[headerName] = row[colIndex] || '';
                // Gérer les variations de la colonne user_id
                if (headerName.toLowerCase() === 'user_id' && !record[headerName]) {
                  record._isOrphan = true; // Marquer comme orphelin si user_id vide
                }
              }
            });
            return record;
          });

        console.log('Dynamic records created:', dynamicRecords.length);

        const orphanCount = dynamicRecords.filter(r => r._isOrphan).length;
        
        return new Response(
          JSON.stringify({ 
            success: true,
            // Always return `data` for frontend compatibility
            data: dynamicRecords,
            // Keep `records` for backward compatibility
            records: dynamicRecords,
            headers: headers.filter((h: string) => h && h.trim()),
            metadata: {
              totalRows: rows.length,
              validRows: dynamicRecords.length,
              orphanCount: orphanCount,
              hasUserIdColumn: hasUserIdColumn,
              headers: headers.filter((h: string) => h && h.trim()),
              source: 'Google Sheets API',
              spreadsheetId: spreadsheetId,
              sheetName: currentSheetName,
              lastSync: new Date().toISOString()
            },
            message: hasUserIdColumn 
              ? `${dynamicRecords.length} enregistrements importés depuis "${currentSheetName}" (${orphanCount} orphelins)`
              : `${dynamicRecords.length} enregistrements importés depuis "${currentSheetName}" - ATTENTION: aucune colonne user_id trouvée`
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        // Toutes les tentatives ont échoué
        throw lastError || new Error('Impossible de trouver une feuille valide dans le Google Sheet');
      }
      } catch (apiError) {
        console.error('Google Sheets API failed:', apiError);

        // Fallback public access (sheet published to the web): GViz JSON then CSV
        try {
          const sheetNamesToTry = [
            sheetName,
            `'${sheetName}'`,
            `"${sheetName}"`,
            sheetName.replace(/\s+/g, ''),
            'Sheet1',
            'Feuille1',
            'Class Data'
          ];

          // 1) Try GViz JSON (does not require API key if sheet is published)
          for (const currentSheetName of sheetNamesToTry) {
            try {
              console.log(`GViz JSON fallback attempt for: "${currentSheetName}"`);
              const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(currentSheetName)}`;
              const gvizRes = await fetch(gvizUrl);
              if (!gvizRes.ok) {
                console.log(`GViz JSON returned ${gvizRes.status}`);
                continue;
              }
              const gvizText = await gvizRes.text();
              // Extract JSON payload from setResponse(...)
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
                    message: hasUserIdColumn 
                      ? `${dynamicRecords.length} enregistrements importés via GViz (${orphanCount} orphelins)`
                      : `${dynamicRecords.length} enregistrements importés via GViz - ATTENTION: aucune colonne user_id`
                  }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            } catch (e) {
              console.log('GViz JSON parse error:', e);
              continue;
            }
          }

          // 2) Try GViz CSV as a secondary fallback
          const parseCsv = (text: string): string[][] => {
            const rows: string[][] = [];
            let row: string[] = [];
            let cur = '';
            let inQuotes = false;
            for (let i = 0; i < text.length; i++) {
              const ch = text[i];
              const next = text[i + 1];
              if (ch === '"') {
                if (inQuotes && next === '"') { cur += '"'; i++; }
                else { inQuotes = !inQuotes; }
              } else if (ch === ',' && !inQuotes) {
                row.push(cur); cur = '';
              } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
                if (cur !== '' || row.length > 0) { row.push(cur); rows.push(row); row = []; cur = ''; }
              } else {
                cur += ch;
              }
            }
            if (cur !== '' || row.length > 0) { row.push(cur); rows.push(row); }
            return rows;
          };

          for (const currentSheetName of sheetNamesToTry) {
            try {
              console.log(`GViz CSV fallback attempt for: "${currentSheetName}"`);
              const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(currentSheetName)}`;
              const csvRes = await fetch(csvUrl);
              if (!csvRes.ok) { console.log(`GViz CSV returned ${csvRes.status}`); continue; }
              const csvText = await csvRes.text();
              const rows = parseCsv(csvText);
              if (!rows || rows.length < 2) continue;
              const headers = rows[0].map(h => (h || '').trim()).filter(Boolean);
              const dataRows = rows.slice(1);
              const hasUserIdColumn = headers.some((h: string) => h?.trim()?.toLowerCase() === 'user_id');
              console.log('CSV - Colonne user_id trouvée:', hasUserIdColumn);
              
              const dynamicRecords = dataRows
                .filter(r => r.some(cell => (cell ?? '').toString().trim() !== ''))
                .map((r, idx) => {
                  const rec: Record<string, any> = { 
                    id: `gs_${Date.now()}_${idx}`,
                    _isOrphan: !hasUserIdColumn 
                  };
                  headers.forEach((h, i) => { 
                    rec[h] = r[i] ?? '';
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
                      totalRows: dataRows.length,
                      validRows: dynamicRecords.length,
                      orphanCount: orphanCount,
                      hasUserIdColumn: hasUserIdColumn,
                      headers,
                      source: 'Google GViz CSV (public)',
                      spreadsheetId,
                      sheetName: currentSheetName,
                      lastSync: new Date().toISOString()
                    },
                    message: hasUserIdColumn 
                      ? `${dynamicRecords.length} enregistrements importés via CSV (${orphanCount} orphelins)`
                      : `${dynamicRecords.length} enregistrements importés via CSV - ATTENTION: aucune colonne user_id`
                  }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            } catch (e) {
              console.log('GViz CSV parse error:', e);
              continue;
            }
          }
        } catch (fallbackError) {
          console.log('Public fallback attempts failed with error:', fallbackError);
        }

        // If all attempts failed, return 200 with an explanatory error payload
        return new Response(
          JSON.stringify({
            error: 'Accès refusé ou feuille non publiée',
            details: (apiError as any)?.message || 'Impossible d\'accéder à la feuille avec l\'API standard',
            suggestion: 'Rendez la feuille publique et publiez-la sur le web (Fichier > Partager > Publier sur le web), puis réessayez.',
            data: []
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
