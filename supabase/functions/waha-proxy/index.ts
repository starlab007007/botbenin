import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParam = url.searchParams.get('path') || '/dashboard'
    
    // Récupérer les identifiants WAHA depuis les secrets
    const wahaUsername = Deno.env.get('WAHA_USERNAME') || 'admin'
    const wahaPassword = Deno.env.get('WAHA_PASSWORD') || 'Starlab@007'
    
    // Construire l'URL WAHA
    const wahaBaseUrl = 'https://waha.bot.bj'
    const targetUrl = `${wahaBaseUrl}${pathParam}`
    
    console.log(`🎯 Proxy request to: ${targetUrl}`)
    
    // Préparer les en-têtes pour l'authentification Basic
    const basicAuth = btoa(`${wahaUsername}:${wahaPassword}`)
    const proxyHeaders = new Headers()
    proxyHeaders.set('Authorization', `Basic ${basicAuth}`)
    proxyHeaders.set('User-Agent', 'WAHA-Proxy/1.0')
    
    // Copier les en-têtes de la requête originale (sauf Authorization)
    for (const [key, value] of req.headers.entries()) {
      if (key.toLowerCase() !== 'authorization' && key.toLowerCase() !== 'host') {
        proxyHeaders.set(key, value)
      }
    }
    
    // Faire la requête vers WAHA
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: proxyHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.arrayBuffer() : undefined,
    })
    
    console.log(`📡 WAHA response status: ${response.status}`)
    
    // Lire le contenu de la réponse
    const contentType = response.headers.get('content-type') || ''
    let responseBody: ArrayBuffer | string = await response.arrayBuffer()
    
    // Créer les en-têtes de réponse en supprimant les en-têtes bloquants
    const responseHeaders = new Headers()
    
    // Copier tous les en-têtes sauf ceux qui bloquent l'iframe
    for (const [key, value] of response.headers.entries()) {
      const lowerKey = key.toLowerCase()
      if (
        lowerKey !== 'content-security-policy' &&
        lowerKey !== 'x-frame-options' &&
        lowerKey !== 'frame-ancestors' &&
        lowerKey !== 'x-content-type-options'
      ) {
        responseHeaders.set(key, value)
      }
    }
    
    // Ajouter des en-têtes pour permettre l'iframe
    responseHeaders.set('Content-Security-Policy', "frame-ancestors 'self' https://bot.bj https://*.bot.bj https://*.supabase.co; default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;")
    responseHeaders.set('X-Frame-Options', 'ALLOWALL')
    
    // Ajouter les en-têtes CORS
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value)
    })
    
    // Si c'est du HTML (dashboard), injecter le script d'automatisation
    if (contentType.includes('text/html') && pathParam.includes('dashboard')) {
      const htmlContent = new TextDecoder().decode(responseBody)
      
      // Script d'automatisation pour cliquer sur login et extraire QR
      const automationScript = `
      <script>
        console.log('🤖 Script d\\'automatisation WAHA chargé');
        
        // Fonction pour automatiser le clic sur login
        function autoClickLogin(sessionName) {
          console.log('🎯 Recherche du bouton login pour:', sessionName);
          
          // Rechercher les boutons login
          const loginButtons = document.querySelectorAll('button, input[type="button"], a');
          
          for (const button of loginButtons) {
            const text = button.textContent || button.value || '';
            if (text.toLowerCase().includes('login') || text.toLowerCase().includes('start')) {
              console.log('✅ Bouton login trouvé:', text);
              
              // Simuler un clic après un petit délai
              setTimeout(() => {
                button.click();
                console.log('🖱️ Clic automatique sur login effectué');
                
                // Démarrer la surveillance du QR code
                setTimeout(() => startQRMonitoring(sessionName), 2000);
              }, 1000);
              
              return true;
            }
          }
          
          console.log('⚠️ Aucun bouton login trouvé');
          return false;
        }
        
        // Fonction pour surveiller l'apparition du QR code
        function startQRMonitoring(sessionName) {
          console.log('👁️ Surveillance QR code démarrée pour:', sessionName);
          
          const checkForQR = () => {
            // Chercher les images QR ou canvas
            const images = document.querySelectorAll('img[src*="qr"], img[alt*="qr"], img[title*="qr"], canvas');
            const qrImages = Array.from(images).filter(img => {
              const src = img.src || '';
              const alt = img.alt || '';
              const title = img.title || '';
              return src.includes('qr') || alt.toLowerCase().includes('qr') || title.toLowerCase().includes('qr') ||
                     src.includes('data:image') || img.tagName === 'CANVAS';
            });
            
            if (qrImages.length > 0) {
              console.log('📱 QR Code détecté!', qrImages[0]);
              
              // Envoyer le QR code au parent
              const qrSrc = qrImages[0].src || qrImages[0].toDataURL?.() || '';
              if (qrSrc) {
                window.parent.postMessage({
                  type: 'qr-found',
                  qrCode: qrSrc,
                  sessionName: sessionName
                }, '*');
              }
              
              return true;
            }
            
            return false;
          };
          
          // Vérifier périodiquement
          const qrInterval = setInterval(() => {
            if (checkForQR()) {
              clearInterval(qrInterval);
            }
          }, 2000);
          
          // Arrêter après 30 secondes
          setTimeout(() => {
            clearInterval(qrInterval);
            console.log('⏰ Surveillance QR interrompue (timeout)');
          }, 30000);
        }
        
        // Écouter les messages du parent pour démarrer l'automatisation
        window.addEventListener('message', (event) => {
          if (event.data.type === 'auto-login') {
            console.log('🚀 Automatisation démarrée:', event.data);
            
            // Essayer l'auto-login avec les identifiants fournis
            const usernameField = document.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[id*="user"]');
            const passwordField = document.querySelector('input[type="password"], input[name*="pass"], input[id*="pass"]');
            
            if (usernameField && passwordField) {
              usernameField.value = event.data.username || '${wahaUsername}';
              passwordField.value = event.data.password || '${wahaPassword}';
              
              // Déclencher les événements de changement
              usernameField.dispatchEvent(new Event('input', { bubbles: true }));
              passwordField.dispatchEvent(new Event('input', { bubbles: true }));
              
              console.log('🔐 Identifiants remplis automatiquement');
            }
            
            // Essayer le clic automatique sur login
            setTimeout(() => {
              autoClickLogin(event.data.sessionName);
            }, 500);
          }
          
          if (event.data.type === 'start-session-login') {
            console.log('🎯 Démarrage session login pour:', event.data.sessionName);
            autoClickLogin(event.data.sessionName);
          }
        });
        
        // Auto-démarrage si on est déjà sur la page du dashboard
        document.addEventListener('DOMContentLoaded', () => {
          console.log('📄 Page WAHA chargée, prêt pour automatisation');
          
          // Informer le parent que la page est prête
          window.parent.postMessage({
            type: 'waha-ready'
          }, '*');
        });
        
        // Si déjà chargé
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          window.parent.postMessage({
            type: 'waha-ready'
          }, '*');
        }
      </script>
      `
      
      // Injecter le script avant la fermeture du body
      const modifiedHtml = htmlContent.replace('</body>', `${automationScript}</body>`)
      responseBody = new TextEncoder().encode(modifiedHtml)
      responseHeaders.set('Content-Length', responseBody.byteLength.toString())
    }
    
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
    
  } catch (error) {
    console.error('❌ Erreur proxy WAHA:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Proxy error', 
        message: error.message,
        details: 'Impossible de se connecter au serveur WAHA'
      }), 
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})