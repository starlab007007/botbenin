"use client";

import { useEffect } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': {
        'agent-id': string;
        style?: React.CSSProperties;
      };
    }
  }
}

export default function ConvaiWidget() {
  useEffect(() => {
    // Le script d'embed est déjà chargé dans index.html
    // Vérification que le custom element est disponible
    const checkElement = () => {
      if (customElements.get('elevenlabs-convai')) {
        console.log('✅ ElevenLabs ConvAI widget prêt');
      } else {
        console.log('⏳ En attente du widget ElevenLabs...');
        setTimeout(checkElement, 100);
      }
    };
    
    checkElement();

    // Écoute des événements du widget
    const onReady = () => console.log("[convai] 🟢 Widget prêt");
    const onStart = () => console.log("[convai] 🎤 Conversation démarrée");
    const onEnd = () => console.log("[convai] 🔴 Conversation terminée");
    const onError = (e: Event) =>
      console.error("[convai] ❌ Erreur:", (e as CustomEvent)?.detail ?? e);

    // Écoute des événements window message pour ElevenLabs
    const handleMessage = (event: MessageEvent) => {
      if (event.origin.includes('elevenlabs.io')) {
        console.log('[convai] 📡 Événement:', event.data);
        
        // Dispatch des événements custom selon le type
        switch (event.data?.type) {
          case 'widget-ready':
            window.dispatchEvent(new CustomEvent('convai:ready'));
            break;
          case 'conversation-started':
            window.dispatchEvent(new CustomEvent('convai:call-start'));
            break;
          case 'conversation-ended':
            window.dispatchEvent(new CustomEvent('convai:call-end'));
            break;
          case 'error':
            window.dispatchEvent(new CustomEvent('convai:error', { detail: event.data }));
            break;
        }
      }
    };

    // Ajout des listeners
    window.addEventListener("convai:ready", onReady);
    window.addEventListener("convai:call-start", onStart);
    window.addEventListener("convai:call-end", onEnd);
    window.addEventListener("convai:error", onError);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener("convai:ready", onReady);
      window.removeEventListener("convai:call-start", onStart);
      window.removeEventListener("convai:call-end", onEnd);
      window.removeEventListener("convai:error", onError);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <elevenlabs-convai
      agent-id="agent_6201k518xhz2eemtsrbf38fmjq7p"
      style={{
        display: "block",
        maxWidth: 520,
        margin: "24px auto",
      }}
    />
  );
}