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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Configuration WAHA
    const wahaUrl = Deno.env.get('WAHA_BASE_URL') || 'https://waha.bot.bj';
    const wahaUsername = Deno.env.get('WAHA_DASHBOARD_USERNAME') || 'admin';
    const wahaPassword = Deno.env.get('WAHA_DASHBOARD_PASSWORD') || 'Starlab@007';
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    console.log('WAHA Dashboard Mirror - Configuration:', {
      wahaUrl: wahaUrl ? 'SET' : 'NOT SET',
      wahaUsername: wahaUsername ? 'SET' : 'NOT SET',
      wahaPassword: wahaPassword ? 'SET' : 'NOT SET',
      wahaApiKey: wahaApiKey ? 'SET' : 'NOT SET'
    });

    const { method, url } = req;
    const urlParams = new URL(url);
    const path = urlParams.searchParams.get('path') || '/dashboard';
    const autoQr = urlParams.searchParams.get('autoQr'); // Nouveau paramètre pour auto-QR
    
    // Build the complete WAHA URL
    const base = wahaUrl.replace(/\/+$/, '');
    const targetPath = `/${path.replace(/^\/+/, '')}`;
    const fullWahaUrl = `${base}${targetPath}`;

    console.log(`Mirroring ${method} request to: ${fullWahaUrl}`);
    if (autoQr) {
      console.log(`🎯 Auto QR mode activé pour session: ${autoQr}`);
    }

    // Force Basic Auth for auto-login (priorité sur API key pour l'auto-connexion)
    let authHeaders: Record<string, string> = {};
    const basicAuth = btoa(`${wahaUsername}:${wahaPassword}`);
    authHeaders['Authorization'] = `Basic ${basicAuth}`;
    console.log('🔐 Authentification automatique avec Basic Auth activée');

    // Prepare request headers
    const requestHeaders: Record<string, string> = {
      ...authHeaders,
      'User-Agent': req.headers.get('User-Agent') || 'WAHA-Dashboard-Mirror',
      'Accept': req.headers.get('Accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': req.headers.get('Accept-Language') || 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    // Add Content-Type for POST/PUT requests
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      requestHeaders['Content-Type'] = req.headers.get('Content-Type') || 'application/json';
    }

    // Get request body for POST/PUT requests
    let body: BodyInit | null = null;
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      body = await req.arrayBuffer();
    }

    console.log('Making request to WAHA with headers:', {
      ...requestHeaders,
      'Authorization': requestHeaders.Authorization ? '[REDACTED]' : 'None',
      'X-Api-Key': requestHeaders['X-Api-Key'] ? '[REDACTED]' : 'None'
    });

    // Make the request to WAHA
    const wahaResponse = await fetch(fullWahaUrl, {
      method,
      headers: requestHeaders,
      body,
    });

    console.log(`WAHA response status: ${wahaResponse.status}`);

    // Get response content
    const responseBody = await wahaResponse.arrayBuffer();
    const contentType = wahaResponse.headers.get('content-type') || '';

    // Prepare response headers
    const responseHeaders = new Headers(corsHeaders);
    
    // Copy important headers from WAHA response
    for (const [key, value] of wahaResponse.headers.entries()) {
      if (['content-type', 'content-length', 'cache-control', 'expires', 'last-modified'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    }

    // Enhanced HTML rewriting for better proxy functionality
    if (contentType.includes('text/html')) {
      let htmlContent = new TextDecoder().decode(responseBody);
      
      // Build proxy base URL
      const proxyBase = `${urlParams.origin}/functions/v1/waha-dashboard-mirror?path=`;
      const apiProxyBase = `${urlParams.origin}/functions/v1/waha-dashboard-proxy`;
      
      // Si mode autoQr, masquer tout le contenu sauf la session spécifique
      if (autoQr) {
        htmlContent = htmlContent.replace(
          /<body[^>]*>/i,
          `<body style="margin: 0; padding: 20px; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <style>
            /* Masquer tout le contenu du dashboard par défaut */
            .container, .sidebar, .header, .footer, .navigation,
            .main-content > *, .dashboard-grid, .stats-cards, .charts,
            h1:not(.session-title), h2:not(.session-title), nav, 
            .navbar, .menu, .breadcrumb, table:not(.session-table) {
              display: none !important;
            }
            
            /* Interface minimale pour la session */
            body {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .session-container {
              background: white;
              border-radius: 12px;
              padding: 32px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 450px;
              width: 100%;
            }
            
            .session-title {
              margin: 0 0 24px 0;
              color: #1f2937;
              font-size: 24px;
              font-weight: 600;
            }
            
            .qr-container {
              margin: 24px 0;
            }
            
            .qr-container img {
              width: 280px;
              height: 280px;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
            }
            
            .status-info {
              margin-top: 20px;
              padding: 12px;
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 6px;
              color: #166534;
              font-size: 14px;
            }
            
            .loading {
              margin: 20px 0;
              color: #6b7280;
              font-size: 16px;
            }
          </style>`
        );
      }
      
      // Enhanced URL rewriting patterns
      htmlContent = htmlContent
        // Basic HTML attributes
        .replace(/href="\/([^"]*)">/g, `href="${proxyBase}$1">`)
        .replace(/src="\/([^"]*)">/g, `src="${proxyBase}$1">`)
        .replace(/action="\/([^"]*)">/g, `action="${proxyBase}$1">`)
        // CSS url() patterns
        .replace(/url\(["']?\/([^"')]*?)["']?\)/g, `url("${proxyBase}$1")`)
        // JavaScript patterns for fetch and XMLHttpRequest
        .replace(/fetch\s*\(\s*["']\/([^"']*?)["']/g, `fetch("${apiProxyBase}?endpoint=$1"`)
        .replace(/\$\.ajax\s*\(\s*{[^}]*url\s*:\s*["']\/([^"']*?)["']/g, (match, url) => 
          match.replace(`"/${url}"`, `"${apiProxyBase}?endpoint=${url}"`))
        .replace(/axios\.(get|post|put|delete)\s*\(\s*["']\/([^"']*?)["']/g, (match, method, url) =>
          match.replace(`"/${url}"`, `"${apiProxyBase}?endpoint=${url}"`))
        // WebSocket connections
        .replace(/new\s+WebSocket\s*\(\s*["']wss?:\/\/[^"']*\/([^"']*?)["']/g, (match, path) =>
          match.replace(/wss?:\/\/[^"']*\//, `wss://${urlParams.host}/functions/v1/waha-ws-proxy?path=`))
        // Form handling
        .replace(/<form([^>]*)\s+action\s*=\s*["']\/([^"']*?)["']/g, `<form$1 action="${proxyBase}$2"`)
        // Base href injection
        .replace(/<head[^>]*>/i, `$&\n<base href="${proxyBase}">`)
        // Add JavaScript pour gestion automatique et interface spécialisée
        .replace(/<\/head>/i, `
          <script>
            // Override fetch to use proxy
            const originalFetch = window.fetch;
            window.fetch = function(url, options = {}) {
              if (typeof url === 'string' && url.startsWith('/')) {
                url = '${apiProxyBase}?endpoint=' + url.substring(1);
                options.headers = {
                  ...options.headers,
                  'Authorization': 'Bearer ' + (window.supabaseAccessToken || ''),
                  'Content-Type': 'application/json'
                };
              }
              return originalFetch(url, options);
            };
            
            // Override XMLHttpRequest
            const OriginalXHR = window.XMLHttpRequest;
            window.XMLHttpRequest = class extends OriginalXHR {
              open(method, url, ...args) {
                if (typeof url === 'string' && url.startsWith('/')) {
                  url = '${apiProxyBase}?endpoint=' + url.substring(1);
                }
                return super.open(method, url, ...args);
              }
            };

            ${autoQr ? `
            // Mode Auto QR pour session spécifique
            window.addEventListener('DOMContentLoaded', function() {
              console.log('🎯 Mode Auto QR activé pour session: ${autoQr}');
              
              // Remplacer immédiatement le contenu de la page par l'interface QR
              document.body.innerHTML = \`
                <div class="session-container">
                  <h2 class="session-title">Session ${autoQr}</h2>
                  <div class="loading">🔄 Connexion automatique en cours...</div>
                  <div id="qr-result"></div>
                </div>
              \`;
              
              // Fonction pour récupérer le QR via proxy
              async function fetchQRCode() {
                const qrResult = document.getElementById('qr-result');
                
                try {
                  qrResult.innerHTML = '<div class="loading">📱 Génération du QR code...</div>';
                  
                  // Essayer de démarrer la session d'abord
                  console.log('▶️ Démarrage de la session ${autoQr}...');
                  const startResponse = await fetch('${apiProxyBase}?endpoint=api/sessions/${autoQr}/start', {
                    method: 'POST',
                    headers: {
                      'Authorization': 'Bearer ' + (window.supabaseAccessToken || ''),
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (startResponse.ok) {
                    console.log('✅ Session démarrée, récupération du QR...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  }
                  
                  // Récupérer le QR code
                  const qrResponse = await fetch('${apiProxyBase}?endpoint=api/sessions/${autoQr}/auth/qr', {
                    headers: {
                      'Authorization': 'Bearer ' + (window.supabaseAccessToken || ''),
                      'Accept': 'application/json'
                    }
                  });
                  
                  if (qrResponse.ok) {
                    const qrData = await qrResponse.json();
                    console.log('📱 QR code récupéré avec succès');
                    
                    qrResult.innerHTML = \`
                      <div class="qr-container">
                        <img src="\${qrData.qr || qrData.qrCode}" alt="QR Code WhatsApp" />
                      </div>
                      <div class="status-info">
                        ✅ Session prête - Ouvrez WhatsApp > Appareils connectés > Connecter un appareil
                      </div>
                    \`;
                  } else {
                    throw new Error('Impossible de récupérer le QR code');
                  }
                  
                } catch (error) {
                  console.error('❌ Erreur QR:', error);
                  qrResult.innerHTML = \`
                    <div style="color: #dc2626; padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;">
                      ❌ Erreur: \${error.message}<br>
                      <small>Vérifiez que l'API key WAHA a les permissions complètes</small>
                    </div>
                  \`;
                }
              }
              
              // Lancer la récupération du QR après un délai
              setTimeout(fetchQRCode, 1500);
            });
            ` : ''}
          </script>
        </head>`);

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