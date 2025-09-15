let scriptLoaded = false;
let widgetEl: HTMLElement | null = null;

/**
 * Charge le script ElevenLabs ConvAI de façon asynchrone
 */
export const ensureConvaiScript = async (): Promise<void> => {
  if (scriptLoaded) return;
  
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
      scriptLoaded = true;
      resolve();
    };
    
    script.onerror = () => reject(new Error('Échec du chargement du script ConvAI'));
    
    document.head.appendChild(script);
  });
};

/**
 * Attendre que le custom element soit défini
 */
const waitForCustomElement = async (): Promise<void> => {
  if (customElements.get('elevenlabs-convai')) return;
  
  return new Promise<void>((resolve) => {
    const check = () => {
      if (customElements.get('elevenlabs-convai')) {
        resolve();
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
  await waitForCustomElement();
  
  if (widgetEl && document.body.contains(widgetEl)) {
    return widgetEl;
  }

  // Créer le widget
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
  try {
    // Demander permission micro d'abord
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        throw new Error('Accès au micro refusé. Autorise le micro dans ton navigateur.');
      }
    }

    // API publique si disponible
    if (typeof element?.open === 'function') {
      element.open();
    }
    
    await sleep(100);
    
    if (typeof element?.start === 'function') {
      element.start();
    }

    // Fallback: cliquer sur le bouton interne
    await sleep(200);
    const startSelectors = [
      'button[aria-label*="Start"]',
      'button[aria-label*="Unmute"]',
      'button:not([disabled])',
      '[role="button"]'
    ];
    
    const button = findShadowButton(element, startSelectors);
    if (button && !button.disabled) {
      button.click();
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