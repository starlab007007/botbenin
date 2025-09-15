let scriptLoaded = false;
let widgetEl: HTMLElement | null = null;

/**
 * Vérifie si le navigateur supporte les fonctionnalités audio nécessaires
 */
export const checkAudioSupport = (): { supported: boolean; error?: string } => {
  console.log('🔍 Vérification du support audio...');
  
  // Vérifier AudioContext
  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    return { supported: false, error: 'AudioContext non supporté par ce navigateur' };
  }

  // Vérifier AudioWorklet (requis pour ElevenLabs)
  if (!window.AudioWorklet) {
    return { supported: false, error: 'AudioWorklet non supporté. Utilise Chrome 66+, Firefox 76+ ou Safari 14.1+' };
  }

  // Vérifier getUserMedia
  if (!navigator.mediaDevices?.getUserMedia) {
    return { supported: false, error: 'Accès au microphone non supporté par ce navigateur' };
  }

  // Vérifier contexte sécurisé (HTTPS requis pour AudioWorklets)
  if (!window.isSecureContext) {
    return { supported: false, error: 'Contexte sécurisé requis (HTTPS) pour les fonctionnalités audio avancées' };
  }

  console.log('✅ Support audio complet confirmé');
  return { supported: true };
};

/**
 * Charge le script ElevenLabs ConvAI de façon asynchrone
 */
export const ensureConvaiScript = async (): Promise<void> => {
  if (scriptLoaded) return;
  
  console.log('📦 Chargement du script ElevenLabs ConvAI...');
  
  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="convai-widget-embed"]');
    if (existingScript) {
      scriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    
    script.onload = () => {
      console.log('✅ Script ElevenLabs ConvAI chargé avec succès');
      scriptLoaded = true;
      resolve();
    };
    
    script.onerror = () => {
      console.error('❌ Échec du chargement du script ConvAI');
      reject(new Error('Échec du chargement du script ConvAI'));
    };
    
    document.head.appendChild(script);
  });
};

/**
 * Attendre que le custom element soit défini
 */
const waitForCustomElement = async (): Promise<void> => {
  if (customElements.get('elevenlabs-convai')) {
    console.log('✅ Custom element elevenlabs-convai déjà défini');
    return;
  }
  
  console.log('⏳ Attente de la définition du custom element...');
  
  return new Promise<void>((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 100; // 5 secondes max
    
    const check = () => {
      attempts++;
      if (customElements.get('elevenlabs-convai')) {
        console.log('✅ Custom element elevenlabs-convai défini');
        resolve();
      } else if (attempts >= maxAttempts) {
        console.error('❌ Timeout: custom element non défini après 5s');
        reject(new Error('Timeout: widget ElevenLabs non initialisé'));
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
};

/**
 * Monte le widget ElevenLabs dans le DOM (singleton)
 */
export const mountWidget = async (agentId: string): Promise<HTMLElement> => {
  console.log('🔧 Montage du widget ElevenLabs...');
  
  await waitForCustomElement();
  
  if (widgetEl && document.body.contains(widgetEl)) {
    console.log('♻️ Réutilisation du widget existant');
    return widgetEl;
  }

  // Créer le widget
  console.log(`🆕 Création du widget avec agent-id: ${agentId}`);
  widgetEl = document.createElement('elevenlabs-convai') as any;
  widgetEl.setAttribute('agent-id', agentId);
  widgetEl.setAttribute('overlay', 'true');
  
  // Style pour le rendre flottant et responsive
  Object.assign(widgetEl.style, {
    position: 'fixed',
    bottom: '100px',
    right: '20px',
    zIndex: '9998',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    maxWidth: '400px',
    width: '90vw',
    maxHeight: '500px'
  });

  document.body.appendChild(widgetEl);
  console.log('✅ Widget monté dans le DOM');
  return widgetEl;
};

/**
 * Utilitaire pour attendre
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Trouve un bouton dans le Shadow DOM du widget
 */
const findShadowButton = (element: any, selectors: string[]): HTMLButtonElement | null => {
  const shadowRoot: ShadowRoot | null = element?.shadowRoot ?? null;
  if (!shadowRoot) return null;

  for (const selector of selectors) {
    const button = shadowRoot.querySelector<HTMLButtonElement>(selector);
    if (button) return button;
  }
  return null;
};

/**
 * Démarre la conversation avec l'agent IA
 */
export const startConversation = async (element: any): Promise<void> => {
  console.log('🎤 Démarrage de la conversation...');
  
  try {
    // Vérifier d'abord le support audio
    const audioSupport = checkAudioSupport();
    if (!audioSupport.supported) {
      throw new Error(audioSupport.error);
    }

    // Demander permission micro d'abord
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        console.log('🎙️ Demande d\'accès au microphone...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        // Tester l'AudioContext avec le stream
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        console.log('✅ AudioContext et MediaStream créés avec succès');
        
        // Nettoyer le test
        source.disconnect();
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        
      } catch (error: any) {
        console.error('❌ Erreur audio:', error);
        if (error.name === 'NotAllowedError') {
          throw new Error('Accès au micro refusé. Autorise le micro dans ton navigateur.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('Aucun microphone détecté. Vérifie tes périphériques audio.');
        } else {
          throw new Error(`Erreur audio: ${error.message}`);
        }
      }
    }

    // API publique si disponible
    console.log('🚀 Tentative d\'ouverture via API publique...');
    if (typeof element?.open === 'function') {
      element.open();
      console.log('✅ Widget ouvert via API');
    }
    
    await sleep(100);
    
    if (typeof element?.start === 'function') {
      element.start();
      console.log('✅ Conversation démarrée via API');
    }

    // Fallback: cliquer sur le bouton interne
    console.log('🔄 Fallback: recherche du bouton interne...');
    await sleep(200);
    const startSelectors = [
      'button[aria-label*="Start"]',
      'button[aria-label*="Unmute"]',
      'button:not([disabled])',
      '[role="button"]'
    ];
    
    const button = findShadowButton(element, startSelectors);
    if (button && !button.disabled) {
      console.log('🖱️ Clic sur le bouton interne');
      button.click();
    } else {
      console.warn('⚠️ Aucun bouton de démarrage trouvé');
    }
  } catch (error: any) {
    throw new Error(error.message || 'Impossible de démarrer la conversation');
  }
};

/**
 * Arrête la conversation
 */
export const stopConversation = async (element: any): Promise<void> => {
  try {
    // API publique si disponible
    if (typeof element?.stop === 'function') {
      element.stop();
    }
    
    await sleep(50);
    
    if (typeof element?.close === 'function') {
      element.close();
    }

    // Fallback: cliquer sur le bouton d'arrêt
    await sleep(150);
    const stopSelectors = [
      'button[aria-label*="Stop"]',
      'button[aria-label*="Close"]',
      'button[aria-label*="End"]'
    ];
    
    const button = findShadowButton(element, stopSelectors);
    button?.click();
  } catch (error) {
    console.warn('Erreur lors de l\'arrêt:', error);
  }
};

/**
 * Supprime le widget du DOM
 */
export const removeWidget = (): void => {
  if (widgetEl && document.body.contains(widgetEl)) {
    document.body.removeChild(widgetEl);
    widgetEl = null;
  }
};

/**
 * Récupère l'instance du widget
 */
export const getWidget = (): HTMLElement | null => widgetEl;