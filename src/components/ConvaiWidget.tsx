"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

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
  const [isReady, setIsReady] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);

  useEffect(() => {
    // Injecter le script d'embed s'il n'est pas présent
    const src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    if (!document.querySelector(`script[src="${src}"]`)) {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.type = "text/javascript";
      document.body.appendChild(script);
    }

    // Vérification que le custom element est disponible
    const checkElement = () => {
      if (customElements.get('elevenlabs-convai')) {
        console.log('✅ ElevenLabs ConvAI widget prêt');
        setIsReady(true);
      } else {
        console.log('⏳ En attente du widget ElevenLabs...');
        setTimeout(checkElement, 100);
      }
    };
    
    checkElement();

    // Écoute des événements du widget
    const onReady = () => console.log("[convai] 🟢 Widget prêt");
    const onStart = () => {
      console.log("[convai] 🎤 Conversation démarrée");
      setShowStartButton(false);
    };
    const onEnd = () => {
      console.log("[convai] 🔴 Conversation terminée");
      setShowStartButton(true);
    };
    const onError = (e: Event) =>
      console.error("[convai] ❌ Erreur:", (e as CustomEvent)?.detail ?? e);

    // Écoute des événements window message pour ElevenLabs
    const handleMessage = (event: MessageEvent) => {
      if (event.origin.includes('elevenlabs.io')) {
        console.log('[convai] 📡 Événement:', event.data);
        
        switch (event.data?.type) {
          case 'widget-ready':
            window.dispatchEvent(new CustomEvent('convai:ready'));
            break;
          case 'conversation-started':
          case 'call-start':
            window.dispatchEvent(new CustomEvent('convai:call-start'));
            break;
          case 'conversation-ended':
          case 'call-end':
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

  const handleStartConversation = () => {
    setShowStartButton(false);
    console.log('🎤 Démarrage de la conversation...');
  };

  if (!isReady) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 rounded-full border-3 border-purple-200 border-t-purple-500 animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Chargement du widget vocal...</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      {/* Toujours afficher le widget ElevenLabs mais contrôler la visibilité du bouton */}
      <div className="relative">
        {/* Widget ElevenLabs - toujours présent dans le DOM */}
        <elevenlabs-convai
          agent-id="agent_6201k518xhz2eemtsrbf38fmjq7p"
          style={{
            display: "block",
            maxWidth: 520,
            margin: "0 auto",
            borderRadius: "12px",
          }}
        />
        
        {/* Overlay avec bouton de démarrage */}
        {showStartButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-xl">
            <div className="space-y-4">
              <Button
                onClick={handleStartConversation}
                size="lg"
                className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-full"
              >
                <Mic className="w-5 h-5 mr-3" />
                Démarrer la conversation
              </Button>
              <p className="text-sm text-muted-foreground">
                Cliquez pour commencer à parler avec l'agent IA
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}