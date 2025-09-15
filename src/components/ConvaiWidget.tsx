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
  const [isActive, setIsActive] = useState(false);
  const [showWidget, setShowWidget] = useState(false);

  useEffect(() => {
    // Le script d'embed est déjà chargé dans index.html
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
    const onReady = () => {
      console.log("[convai] 🟢 Widget prêt");
      setIsReady(true);
    };
    
    const onStart = () => {
      console.log("[convai] 🎤 Conversation démarrée");
      setIsActive(true);
    };
    
    const onEnd = () => {
      console.log("[convai] 🔴 Conversation terminée");
      setIsActive(false);
    };
    
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
    setShowWidget(true);
    setIsActive(true);
    
    // Activer le widget après un court délai
    setTimeout(() => {
      const widget = document.querySelector('elevenlabs-convai') as any;
      if (widget) {
        // Déclencher le clic sur le widget pour démarrer la conversation
        widget.click();
        console.log('🎤 Widget ElevenLabs activé');
      }
    }, 100);
  };

  const handleStopConversation = () => {
    setIsActive(false);
    setShowWidget(false);
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
      {!showWidget && (
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
      )}

      {showWidget && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 p-4 rounded-lg border border-green-200/20">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              <span className="text-lg font-medium text-foreground">Conversation active</span>
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            </div>
            
            {/* Widget ElevenLabs */}
            <elevenlabs-convai
              agent-id="agent_6201k518xhz2eemtsrbf38fmjq7p"
              style={{
                display: "block",
                maxWidth: 520,
                margin: "0 auto",
                borderRadius: "12px",
              }}
            />
          </div>
          
          <Button
            onClick={handleStopConversation}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <MicOff className="w-4 h-4 mr-2" />
            Arrêter la conversation
          </Button>
        </div>
      )}
    </div>
  );
}