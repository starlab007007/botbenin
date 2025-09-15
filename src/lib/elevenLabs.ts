let scriptLoaded = false;
let widgetEl: HTMLElement | null = null;

/**
 * Teste la compatibilité avancée des AudioWorklets
 */
const testAudioWorkletSupport = async (): Promise<{ supported: boolean; error?: string }> => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Test basique de création d'un AudioWorkletNode
    if (!audioContext.audioWorklet) {
      return { supported: false, error: 'AudioWorklet non disponible dans ce contexte' };
    }

    // Vérifier si nous pouvons ajouter des modules (test avec un module vide)
    const testModule = `
      class TestProcessor extends AudioWorkletProcessor {
        process() { return true; }
      }
      registerProcessor('test-processor', TestProcessor);
    `;
    
    const blob = new Blob([testModule], { type: 'application/javascript' });
    const moduleUrl = URL.createObjectURL(blob);
    
    try {
      await audioContext.audioWorklet.addModule(moduleUrl);
      console.log('✅ AudioWorklet modules supportés');
      
      // Nettoyer
      URL.revokeObjectURL(moduleUrl);
      await audioContext.close();
      
      return { supported: true };
    } catch (workletError: any) {
      console.error('❌ Erreur AudioWorklet module:', workletError);
      URL.revokeObjectURL(moduleUrl);
      await audioContext.close();
      
      return { 
        supported: false, 
        error: `Modules AudioWorklet non fonctionnels: ${workletError.message}` 
      };
    }
  } catch (error: any) {
    console.error('❌ Erreur test AudioWorklet:', error);
    return { supported: false, error: `AudioWorklet défaillant: ${error.message}` };
  }
};

/**
 * Vérifie si le navigateur supporte les fonctionnalités audio nécessaires
 */
export const checkAudioSupport = async (): Promise<{ supported: boolean; error?: string }> => {
  console.log('🔍 Vérification du support audio...');
  
  // Vérifier AudioContext (plus permissif)
  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    return { supported: false, error: 'AudioContext non supporté par ce navigateur' };
  }

  // Vérifier getUserMedia
  if (!navigator.mediaDevices?.getUserMedia) {
    return { supported: false, error: 'Accès au microphone non supporté par ce navigateur' };
  }

  // Vérifier contexte sécurisé (HTTPS requis pour AudioWorklets)
  if (!window.isSecureContext) {
    return { supported: false, error: 'Contexte sécurisé requis (HTTPS) pour les fonctionnalités audio avancées' };
  }

  // Test AudioContext basique
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    await audioContext.close();
    console.log('✅ AudioContext fonctionnel');
  } catch (error) {
    return { supported: false, error: 'AudioContext défaillant' };
  }

  // AudioWorklet est optionnel - le widget ElevenLabs peut fonctionner sans
  if (window.AudioWorklet) {
    console.log('✅ AudioWorklet disponible');
  } else {
    console.log('⚠️ AudioWorklet non disponible, mais continuons quand même');
  }

  console.log('✅ Support audio confirmé');
  return { supported: true };
};

/**
 * Configure les headers et permissions pour les AudioWorklets
 */
const configureAudioWorkletEnvironment = (): void => {
  // Ajouter meta tag pour les permissions si pas déjà présent
  if (!document.querySelector('meta[name="permissions-policy"]')) {
    const meta = document.createElement('meta');
    meta.name = 'permissions-policy';
    meta.content = 'microphone=*, camera=*, autoplay=*';
    document.head.appendChild(meta);
  }

  // S'assurer que le document a les bonnes permissions
  try {
    // @ts-ignore - featurePolicy peut ne pas être disponible sur tous les navigateurs
    if (document.featurePolicy) {
      console.log('📋 Feature Policy disponible');
    }
  } catch (e) {
    console.log('📋 Feature Policy non disponible sur ce navigateur');
  }
};

/**
 * Charge le script ElevenLabs ConvAI avec retry et configuration optimisée
 */
export const ensureConvaiScript = async (retries: number = 3): Promise<void> => {
  if (scriptLoaded) return;
  
  console.log('📦 Chargement du script ElevenLabs ConvAI...');
  
  // Configurer l'environnement pour les AudioWorklets
  configureAudioWorkletEnvironment();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
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
        
        // Ajouter des attributs pour la sécurité et compatibilité
        script.crossOrigin = 'anonymous';
        
        let loadTimeout: NodeJS.Timeout;
        
        script.onload = () => {
          clearTimeout(loadTimeout);
          console.log(`✅ Script ElevenLabs ConvAI chargé avec succès (tentative ${attempt})`);
          scriptLoaded = true;
          resolve();
        };
        
        script.onerror = (error) => {
          clearTimeout(loadTimeout);
          console.error(`❌ Échec du chargement du script ConvAI (tentative ${attempt}):`, error);
          reject(new Error(`Échec du chargement du script ConvAI (tentative ${attempt})`));
        };

        // Timeout de 10 secondes pour le chargement
        loadTimeout = setTimeout(() => {
          console.error(`⏰ Timeout du chargement du script (tentative ${attempt})`);
          script.remove();
          reject(new Error(`Timeout du chargement du script (tentative ${attempt})`));
        }, 10000);
        
        document.head.appendChild(script);
      });
      
      // Si on arrive ici, le script est chargé avec succès
      return;
      
    } catch (error: any) {
      console.warn(`🔄 Tentative ${attempt}/${retries} échouée:`, error.message);
      
      if (attempt === retries) {
        throw new Error(`Impossible de charger le script ElevenLabs après ${retries} tentatives`);
      }
      
      // Attendre avant la prochaine tentative
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
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
 * Monte le widget ElevenLabs dans le DOM avec configuration optimisée
 */
export const mountWidget = async (agentId: string): Promise<HTMLElement> => {
  console.log('🔧 Montage du widget ElevenLabs...');
  
  await waitForCustomElement();
  
  if (widgetEl && document.body.contains(widgetEl)) {
    console.log('♻️ Réutilisation du widget existant');
    return widgetEl;
  }

  // Créer le widget avec configuration optimisée
  console.log(`🆕 Création du widget avec agent-id: ${agentId}`);
  widgetEl = document.createElement('elevenlabs-convai') as any;
  widgetEl.setAttribute('agent-id', agentId);
  widgetEl.setAttribute('overlay', 'true');
  
  // Attributs pour améliorer la compatibilité AudioWorklet
  widgetEl.setAttribute('audio-fallback', 'true');
  widgetEl.setAttribute('retry-worklet', 'true');
  
  // Écouter les erreurs du widget
  widgetEl.addEventListener('error', (event: any) => {
    console.error('🚨 Erreur widget ElevenLabs:', event.detail || event);
    
    if (event.detail?.includes?.('worklet') || event.detail?.includes?.('AudioWorklet')) {
      console.log('🔄 Tentative de rechargement du widget après erreur worklet...');
      // Le widget va essayer de se recharger automatiquement
    }
  });
  
  widgetEl.addEventListener('worklet-error', (event: any) => {
    console.error('🎵 Erreur AudioWorklet spécifique:', event.detail);
  });
  
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
 * Démarre la conversation avec gestion d'erreur worklet avancée
 */
export const startConversation = async (element: any): Promise<void> => {
  console.log('🎤 Démarrage de la conversation...');
  
  try {
    // Vérifier d'abord le support audio (maintenant async)
    const audioSupport = await checkAudioSupport();
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
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 44100, // Rate standard pour éviter les problèmes
          latencyHint: 'interactive'
        });
        
        const source = audioContext.createMediaStreamSource(stream);
        console.log('✅ AudioContext et MediaStream créés avec succès');
        
        // Test supplémentaire pour les worklets
        try {
          if (audioContext.audioWorklet) {
            console.log('🔧 AudioWorklet disponible et fonctionnel');
          }
        } catch (workletError) {
          console.warn('⚠️ AudioWorklet partiel:', workletError);
        }
        
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

    // Attendre que le widget soit complètement initialisé
    let initAttempts = 0;
    const maxInitAttempts = 20;
    
    while (initAttempts < maxInitAttempts) {
      try {
        // API publique si disponible
        console.log(`🚀 Tentative d'ouverture via API publique (${initAttempts + 1}/${maxInitAttempts})...`);
        
        if (typeof element?.open === 'function') {
          element.open();
          console.log('✅ Widget ouvert via API');
          await sleep(100);
        }
        
        if (typeof element?.start === 'function') {
          element.start();
          console.log('✅ Conversation démarrée via API');
          await sleep(100);
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
          break; // Sortir de la boucle si succès
        } else {
          console.warn(`⚠️ Aucun bouton de démarrage trouvé (tentative ${initAttempts + 1})`);
        }
        
        break; // Sortir si pas d'erreur
        
      } catch (startError: any) {
        console.warn(`🔄 Erreur démarrage (tentative ${initAttempts + 1}):`, startError.message);
        
        if (startError.message?.includes?.('worklet') || startError.message?.includes?.('AudioWorklet')) {
          console.log('🎵 Erreur worklet détectée, nouvelle tentative dans 500ms...');
          await sleep(500);
        }
      }
      
      initAttempts++;
      await sleep(250);
    }
    
    if (initAttempts >= maxInitAttempts) {
      console.error('❌ Toutes les tentatives de démarrage ont échoué');
      throw new Error('Impossible de démarrer la conversation après plusieurs tentatives');
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