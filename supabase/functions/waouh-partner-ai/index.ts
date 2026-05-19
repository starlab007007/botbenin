// Edge function multi-action pour IA Partner Waouh
// Actions: enrich_business, suggest_products, parse_product_free_text,
// parse_voice_business, reverse_geocode, geocode_address, clean_catalog_entry

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-3-flash-preview';

async function aiTool(system: string, user: string, tool: any) {
  const resp = await fetch(GATEWAY, {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      tools: [{ type: 'function', function: tool }],
      tool_choice: { type: 'function', function: { name: tool.name } },
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  return JSON.parse(args || '{}');
}

const tools = {
  enrich_business: {
    name: 'enrich_business',
    description: 'Enrichit les infos d\'une entreprise africaine',
    parameters: {
      type: 'object',
      properties: {
        categorie: { type: 'string' },
        sous_categorie: { type: 'string' },
        description: { type: 'string', description: 'Description SEO 1-2 phrases en français' },
        tags: { type: 'array', items: { type: 'string' } },
        horaires_typiques: { type: 'string' },
      },
      required: ['categorie', 'description', 'tags'],
    },
  },
  suggest_products: {
    name: 'suggest_products',
    description: 'Suggère des produits typiques pour ce type d\'entreprise au Bénin/Afrique de l\'Ouest avec prix FCFA réalistes',
    parameters: {
      type: 'object',
      properties: {
        produits: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nom: { type: 'string' },
              categorie: { type: 'string' },
              prix_min: { type: 'number' },
              prix_max: { type: 'number' },
              unite: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['nom', 'prix_min', 'prix_max', 'unite'],
          },
        },
      },
      required: ['produits'],
    },
  },
  parse_product_free_text: {
    name: 'parse_product',
    description: 'Extrait les champs structurés d\'une description libre de produit (FCFA par défaut)',
    parameters: {
      type: 'object',
      properties: {
        nom: { type: 'string' },
        categorie: { type: 'string' },
        prix_min: { type: 'number' },
        prix_max: { type: 'number' },
        unite: { type: 'string' },
        stock_estime: { type: 'number' },
        description: { type: 'string' },
      },
      required: ['nom'],
    },
  },
  parse_voice_business: {
    name: 'parse_business',
    description: 'Extrait les champs d\'une entreprise depuis un texte dicté',
    parameters: {
      type: 'object',
      properties: {
        nom_entreprise: { type: 'string' },
        categorie: { type: 'string' },
        description: { type: 'string' },
        adresse_complete: { type: 'string' },
        ville: { type: 'string' },
        quartier: { type: 'string' },
        telephone: { type: 'string' },
        whatsapp: { type: 'string' },
        mobile_money_number: { type: 'string' },
        mobile_money_operator: { type: 'string' },
      },
    },
  },
  clean_catalog_entry: {
    name: 'clean_entry',
    description: 'Nettoie et normalise une entrée du catalogue unifié',
    parameters: {
      type: 'object',
      properties: {
        titre: { type: 'string' },
        categorie: { type: 'string' },
        sous_categorie: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        qualite_score: { type: 'number', description: '0-100' },
      },
      required: ['titre', 'categorie'],
    },
  },
};

async function reverseGeocode(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fr&zoom=16`;
  const r = await fetch(url, { headers: { 'User-Agent': 'WaouhPartner/1.0' } });
  if (!r.ok) throw new Error('Reverse geocode failed');
  const d = await r.json();
  const a = d.address || {};
  return {
    ville: a.city || a.town || a.village || a.municipality || '',
    quartier: a.suburb || a.neighbourhood || a.quarter || a.city_district || '',
    adresse_complete: d.display_name || '',
    pays: a.country || '',
  };
}

async function geocodeAddress(q: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&accept-language=fr`;
  const r = await fetch(url, { headers: { 'User-Agent': 'WaouhPartner/1.0' } });
  if (!r.ok) throw new Error('Geocode failed');
  const d = await r.json();
  if (!d[0]) return { lat: null, lng: null };
  return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon), display: d[0].display_name };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');
    const { action, payload } = await req.json();
    let result: any;

    switch (action) {
      case 'enrich_business':
        result = await aiTool(
          'Tu es expert du marché africain (Bénin, Togo, Côte d\'Ivoire). Réponds en français.',
          `Entreprise: "${payload.nom}" à ${payload.ville || 'ville inconnue'}. Fournis catégorie, description courte, tags et horaires.`,
          tools.enrich_business
        );
        break;
      case 'suggest_products':
        result = await aiTool(
          'Tu connais les commerces africains et les prix locaux en FCFA.',
          `Entreprise: "${payload.nom}" (${payload.categorie || 'non précisé'}) à ${payload.ville || ''}. Suggère 6 à 10 produits/services typiques avec prix FCFA réalistes.`,
          tools.suggest_products
        );
        break;
      case 'parse_product_free_text':
        result = await aiTool(
          'Tu extrais les infos d\'un produit depuis une phrase. Prix en FCFA.',
          payload.text,
          tools.parse_product_free_text
        );
        break;
      case 'parse_voice_business':
        result = await aiTool(
          'Tu extrais les infos d\'une entreprise depuis un texte dicté en français.',
          payload.text,
          tools.parse_voice_business
        );
        break;
      case 'clean_catalog_entry':
        result = await aiTool(
          'Tu nettoies les entrées d\'un catalogue marketplace (titres, catégories, tags). Français.',
          `Entrée: ${JSON.stringify(payload.entry)}. Normalise titre, propose catégorie/sous_categorie/tags et un score qualité 0-100.`,
          tools.clean_catalog_entry
        );
        break;
      case 'reverse_geocode':
        result = await reverseGeocode(payload.lat, payload.lng);
        break;
      case 'geocode_address':
        result = await geocodeAddress(payload.q);
        break;
      default:
        return new Response(JSON.stringify({ error: 'unknown action' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    const msg = e?.message || 'error';
    const status = msg.includes('429') ? 429 : msg.includes('402') ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
