import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 WAHA Dashboard Mirror - Starting request processing');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user authentication
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      console.log('❌ Authentication failed');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ User authenticated:', user.email);

    // Configuration WAHA
    const wahaUrl = Deno.env.get('WAHA_BASE_URL') || 'https://waha.bot.bj';
    const wahaUsername = Deno.env.get('WAHA_DASHBOARD_USERNAME') || 'admin';
    const wahaPassword = Deno.env.get('WAHA_DASHBOARD_PASSWORD') || 'Starlab@007';
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    console.log('WAHA Configuration:', {
      wahaUrl: wahaUrl ? 'SET' : 'NOT SET',
      wahaUsername: wahaUsername ? 'SET' : 'NOT SET',
      wahaPassword: wahaPassword ? 'SET' : 'NOT SET',
      wahaApiKey: wahaApiKey ? 'SET' : 'NOT SET'
    });

    const { method, url } = req;
    const urlParams = new URL(url);
    const path = urlParams.searchParams.get('path') || 'dashboard';
    const autoQr = urlParams.searchParams.get('autoQr');
    
    // Build the complete WAHA URL - toujours pointer vers /dashboard
    const targetUrl = `${wahaUrl}/dashboard`;
    
    console.log(`📱 Mirroring ${method} request to: ${targetUrl}`);
    if (autoQr) {
      console.log(`🎯 Auto QR mode pour session: ${autoQr}`);
    }

    // Force Basic Auth pour auto-connexion
    const basicAuth = btoa(`${wahaUsername}:${wahaPassword}`);
    const requestHeaders = {
      'Authorization': `Basic ${basicAuth}`,
      'User-Agent': req.headers.get('User-Agent') || 'WAHA-Dashboard-Mirror',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    console.log('🔐 Using Basic Auth for auto-login');

    // Get request body for POST/PUT requests
    let body: BodyInit | null = null;
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      body = await req.arrayBuffer();
      requestHeaders['Content-Type'] = req.headers.get('Content-Type') || 'application/json';
    }

    console.log('Making authenticated request to WAHA dashboard...');

    // Make the request to WAHA
    const wahaResponse = await fetch(targetUrl, {
      method,
      headers: requestHeaders,
      body,
    });

    console.log(`✅ WAHA response status: ${wahaResponse.status}`);

    if (!wahaResponse.ok) {
      console.error(`❌ WAHA request failed: ${wahaResponse.status} ${wahaResponse.statusText}`);
      const errorText = await wahaResponse.text();
      console.error('Error details:', errorText);
      
      return new Response(JSON.stringify({ 
        error: 'WAHA request failed', 
        status: wahaResponse.status,
        details: errorText 
      }), {
        status: wahaResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get response content
    const responseBody = await wahaResponse.arrayBuffer();
    const contentType = wahaResponse.headers.get('content-type') || '';

    console.log('📄 Content-Type:', contentType);

    // Prepare response headers
    const responseHeaders = new Headers(corsHeaders);
    
    // Copy important headers from WAHA response
    for (const [key, value] of wahaResponse.headers.entries()) {
      if (['content-type', 'content-length', 'cache-control', 'expires', 'last-modified'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    }

    // Process HTML content
    if (contentType.includes('text/html')) {
      let htmlContent = new TextDecoder().decode(responseBody);
      
      console.log('🔄 Processing HTML content...');
      
      // Build proxy URLs
      const proxyBase = `${urlParams.origin}/functions/v1/waha-dashboard-mirror?path=`;
      const apiProxyBase = `${urlParams.origin}/functions/v1/waha-dashboard-proxy`;
      
      // Basic URL rewriting for resources
      htmlContent = htmlContent
        .replace(/href="\/([^"]*)">/g, `href="${proxyBase}$1">`)
        .replace(/src="\/([^"]*)">/g, `src="${wahaUrl}/$1">`)
        .replace(/action="\/([^"]*)">/g, `action="${proxyBase}$1">`)
        .replace(/url\(["']?\/([^"')]*?)["']?\)/g, `url("${wahaUrl}/$1")`)
        .replace(/"\/api\//g, `"${apiProxyBase}?endpoint=api/`)
        .replace(/'\/api\//g, `'${apiProxyBase}?endpoint=api/`);

      // Si mode autoQr, injecter du CSS pour masquer le contenu et JavaScript pour auto-navigation
      if (autoQr) {
        console.log(`🎯 Activating Auto QR mode for session: ${autoQr}`);
        
        htmlContent = htmlContent.replace(
          /<\/head>/i,
          `
          <style>
            /* Masquer le contenu non essentiel en mode Auto QR */
            .sidebar:not(.session-sidebar),
            .header:not(.session-header),
            .footer,
            .navigation:not(.session-nav),
            .dashboard-stats,
            .charts-container,
            .user-management {
              display: none !important;
            }
            
            /* Mettre en évidence la session cible */
            [data-session="${autoQr}"],
            .session-${autoQr},
            .session-row:has([data-session-name="${autoQr}"]) {
              background: #fef3c7 !important;
              border: 2px solid #f59e0b !important;
              border-radius: 8px !important;
              padding: 16px !important;
              margin: 8px 0 !important;
            }
          </style>
          
          <script>
            console.log('🎯 Auto QR Mode activé pour session: ${autoQr}');
            
            // Attendre que la page soit chargée
            window.addEventListener('DOMContentLoaded', function() {
              setTimeout(function() {
                console.log('🔍 Recherche de la session ${autoQr}...');
                
                // Chercher la session spécifique
                const sessionElements = [
                  ...document.querySelectorAll('[data-session="${autoQr}"]'),
                  ...document.querySelectorAll('.session-${autoQr}'),
                  ...document.querySelectorAll('tr:has(td:contains("${autoQr}"))'),
                  ...document.querySelectorAll('div:has(span:contains("${autoQr}"))')
                ];
                
                if (sessionElements.length > 0) {
                  const sessionElement = sessionElements[0];
                  console.log('✅ Session trouvée, recherche du bouton login/start...');
                  
                  // Chercher le bouton login/start dans cette session
                  const buttons = [
                    ...sessionElement.querySelectorAll('button'),
                    ...sessionElement.querySelectorAll('a'),
                    ...sessionElement.querySelectorAll('[onclick]')
                  ];
                  
                  const loginButton = buttons.find(btn => {
                    const text = (btn.textContent || '').toLowerCase();
                    const onclick = (btn.getAttribute('onclick') || '').toLowerCase();
                    return text.includes('login') || text.includes('start') || 
                           text.includes('connect') || onclick.includes('login') ||
                           onclick.includes('start') || onclick.includes('qr');
                  });
                  
                  if (loginButton) {
                    console.log('🎯 Bouton trouvé, clic automatique...');
                    loginButton.click();
                  } else {
                    console.log('⚠️ Bouton login/start non trouvé pour la session');
                  }
                } else {
                  console.log('⚠️ Session ${autoQr} non trouvée dans le dashboard');
                }
              }, 2000);
            });
          </script>
          </head>`
        );
      } else {
        // Mode normal - juste ajouter le proxy JavaScript
        htmlContent = htmlContent.replace(
          /<\/head>/i,
          `
          <script>
            // Override fetch pour utiliser le proxy
            const originalFetch = window.fetch;
            window.fetch = function(url, options = {}) {
              if (typeof url === 'string' && url.startsWith('/api/')) {
                url = '${apiProxyBase}?endpoint=' + url.substring(1);
                options.headers = {
                  ...options.headers,
                  'Authorization': 'Bearer ' + (localStorage.getItem('supabase.auth.token') || ''),
                };
              }
              return originalFetch(url, options);
            };
          </script>
          </head>`
        );
      }

      console.log('✅ HTML content processed successfully');

      return new Response(htmlContent, {
        status: wahaResponse.status,
        headers: responseHeaders,
      });
    }

    // For other content types (CSS, JS, images, JSON), return as-is
    return new Response(responseBody, {
      status: wahaResponse.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('WAHA Dashboard Mirror error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Mirror proxy error', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});