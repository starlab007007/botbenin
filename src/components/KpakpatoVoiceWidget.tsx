"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertCircle, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

// Déclaration TypeScript pour le widget custom element
declare global {
  interface Window {
    __elevenlabs_convai_loaded?: boolean;
  }
  
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': {
        'agent-id': string;
        'server-location'?: string;
        'variant'?: string;
        'action-text'?: string;
        'start-call-text'?: string;
        'end-call-text'?: string;
        'dynamic-variables'?: string;
        'auto-open'?: boolean;
        style?: React.CSSProperties;
        ref?: React.RefObject<HTMLElement>;
      };
    }
  }
}

interface KpakpatoVoiceWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'center';
  agentId?: string;
  serverLocation?: string;
  variant?: string;
  actionText?: string;
  startCallText?: string;
  endCallText?: string;
  dynamicVariables?: object;
  autoOpen?: boolean;
  onUnsupported?: () => void;
}

// Vérification du support AudioWorklet
const isAudioWorkletSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Vérifier le support d'AudioContext et AudioWorklet
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return false;
    
    // Vérifier que AudioWorklet est disponible
    const audioContext = new AudioContextClass();
    const hasAudioWorklet = audioContext.audioWorklet !== undefined;
    
    // Nettoyer le contexte audio de test
    audioContext.close();
    
    return hasAudioWorklet;
  } catch (error) {
    console.warn('AudioWorklet support check failed:', error);
    return false;
  }
};

// Vérifier si on est en HTTPS ou localhost
const isSecureContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext || window.location.hostname === 'localhost';
};

export const KpakpatoVoiceWidget: React.FC<KpakpatoVoiceWidgetProps> = ({ 
  className = "", 
  position = 'bottom-right',
  agentId = "agent_6201k518xhz2eemtsrbf38fmjq7p",
  serverLocation = "us",
  variant = "expanded",
  actionText = "Parler avec Kpakpato",
  startCallText = "Démarrer",
  endCallText = "Terminer",
  dynamicVariables,
  autoOpen = false,
  onUnsupported
}) => {
  const [isReady, setIsReady] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const widgetRef = useRef<HTMLElement>(null);

  // Gestion SSR - ne rien faire côté serveur
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Vérifier le support du navigateur
  useEffect(() => {
    if (!isClient) return;

    console.log('🔍 Vérification du support AudioWorklet...');
    
    const audioWorkletSupported = isAudioWorkletSupported();
    const secureContext = isSecureContext();
    
    console.log('AudioWorklet supporté:', audioWorkletSupported);
    console.log('Contexte sécurisé (HTTPS):', secureContext);
    
    if (!audioWorkletSupported || !secureContext) {
      setIsSupported(false);
      const reason = !secureContext 
        ? 'HTTPS requis pour la conversation vocale'
        : 'AudioWorklet non supporté par ce navigateur';
      
      console.warn('❌ Widget vocal non supporté:', reason);
      setHasError(`Votre navigateur ne supporte pas la conversation vocale (${reason})`);
      
      if (onUnsupported) {
        onUnsupported();
      }
      
      return;
    }
    
    setIsSupported(true);
    console.log('✅ Support navigateur confirmé');
  }, [isClient, onUnsupported]);

  // Variables dynamiques
  const getDynamicVariables = useCallback(() => {
    if (typeof window === 'undefined') return '{}';
    
    if (dynamicVariables) {
      return JSON.stringify(dynamicVariables);
    }
    
    const userName = localStorage.getItem("name") || "Visiteur";
    return JSON.stringify({
      user_name: userName,
      origin: "bot.bj"
    });
  }, [dynamicVariables]);

  // Vérifier les permissions microphone
  const checkMicrophonePermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (error) {
      console.error('❌ Permissions microphone refusées:', error);
      setHasError('Permissions microphone requises pour utiliser Kpakpato');
      toast.error('Veuillez autoriser l\'accès au microphone', {
        duration: 5000,
        description: 'Kpakpato a besoin du microphone pour fonctionner'
      });
      return false;
    }
  };

  // Charger le script ElevenLabs une seule fois
  useEffect(() => {
    if (!isClient || !isSupported) return;

    // Vérifier si déjà chargé
    if (window.__elevenlabs_convai_loaded) {
      setScriptLoaded(true);
      return;
    }

    const src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    const existingScript = document.querySelector(`script[src="${src}"]`);
    
    if (!existingScript) {
      console.log('📥 Chargement du script ElevenLabs...');
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.type = "text/javascript";
      
      script.onload = () => {
        console.log('✅ Script ElevenLabs chargé');
        window.__elevenlabs_convai_loaded = true;
        setScriptLoaded(true);
      };

      script.onerror = () => {
        console.error('❌ Erreur chargement script ElevenLabs');
        setHasError('Impossible de charger le widget vocal');
      };

      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, [isClient, isSupported]);

  // Vérifier que le custom element est disponible
  useEffect(() => {
    if (!scriptLoaded) return;

    const checkElement = () => {
      if (customElements.get('elevenlabs-convai')) {
        console.log('✅ Widget ElevenLabs prêt');
        setIsReady(true);
      } else {
        console.log('⏳ En attente du widget...');
        setTimeout(checkElement, 100);
      }
    };
    
    checkElement();
  }, [scriptLoaded]);

  // Écouter les événements du widget
  useEffect(() => {
    if (!isReady) return;

    const handleCallStart = () => {
      console.log('🎤 Appel démarré');
      setIsCallActive(true);
      toast.success('🎤 Conversation avec Kpakpato démarrée !');
    };

    const handleCallEnd = () => {
      console.log('📞 Appel terminé');
      setIsCallActive(false);
      toast.info('📞 Conversation terminée');
    };

    const handleError = (event: Event) => {
      console.error('❌ Erreur widget:', (event as CustomEvent)?.detail);
      const errorMsg = 'Erreur lors de la connexion avec Kpakpato';
      setHasError(errorMsg);
      toast.error(errorMsg);
    };

    // Écouter les événements personnalisés
    window.addEventListener('elevenlabs-convai:call', handleCallStart);
    window.addEventListener('elevenlabs-convai:call-end', handleCallEnd);
    window.addEventListener('elevenlabs-convai:error', handleError);

    return () => {
      window.removeEventListener('elevenlabs-convai:call', handleCallStart);
      window.removeEventListener('elevenlabs-convai:call-end', handleCallEnd);  
      window.removeEventListener('elevenlabs-convai:error', handleError);
    };
  }, [isReady]);

  // Helpers pour contrôler le widget
  const openKpakpatoWidget = useCallback(() => {
    if (widgetRef.current) {
      console.log('🔊 Ouverture du widget Kpakpato');
      widgetRef.current.dispatchEvent(new CustomEvent('elevenlabs-convai:open'));
    }
  }, []);

  const closeKpakpatoWidget = useCallback(() => {
    if (widgetRef.current) {
      console.log('🔇 Fermeture du widget Kpakpato');
      widgetRef.current.dispatchEvent(new CustomEvent('elevenlabs-convai:close'));
      setIsCallActive(false);
    }
  }, []);

  const resetKpakpatoSession = useCallback(() => {
    if (widgetRef.current) {
      console.log('🔄 Reset de la session Kpakpato');
      widgetRef.current.dispatchEvent(new CustomEvent('elevenlabs-convai:reset'));
      setIsCallActive(false);
      setHasError(null);
      toast.info('🔄 Session réinitialisée');
    }
  }, []);

  // Vérifier permissions avant d'utiliser le widget
  const handleWidgetClick = async () => {
    const hasPermissions = await checkMicrophonePermissions();
    if (!hasPermissions) {
      return;
    }
    // Le widget se chargera automatiquement
  };

  // Styles de positionnement
  const getPositionStyles = () => {
    switch (position) {
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50';
      case 'center':
        return 'flex justify-center items-center';
      case 'bottom-right':
      default:
        return 'fixed bottom-4 right-4 z-50';
    }
  };

  // Ne pas rendre côté serveur
  if (!isClient) {
    return null;
  }

  // Navigateur non supporté
  if (isSupported === false) {
    return (
      <div className={`${getPositionStyles()} ${className}`}>
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 max-w-sm shadow-lg">
          <div className="flex items-center space-x-2 text-warning">
            <MicOff className="h-4 w-4" />
            <span className="text-sm font-medium">Widget vocal indisponible</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Votre navigateur ne supporte pas la conversation vocale (HTTPS et navigateur récent requis)
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => window.open('https://elevenlabs.io/app/talk-to?agent_id=' + agentId, '_blank')} 
            className="mt-2 w-full"
          >
            Ouvrir dans ElevenLabs
          </Button>
        </div>
      </div>
    );
  }

  // État de chargement
  if (!isReady) {
    return (
      <div className={`${getPositionStyles()} ${className}`}>
        <div className="bg-card rounded-full p-4 shadow-lg border">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  // Affichage d'erreur
  if (hasError) {
    return (
      <div className={`${getPositionStyles()} ${className}`}>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-sm shadow-lg">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Erreur Kpakpato</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{hasError}</p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={resetKpakpatoSession}>
              Réessayer
            </Button>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => window.open('https://elevenlabs.io/app/talk-to?agent_id=' + agentId, '_blank')}
            >
              Ouvrir ElevenLabs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${getPositionStyles()} ${className}`}>
      <div className="space-y-2">
        {/* Boutons de contrôle (visibles pendant un appel) */}
        {isCallActive && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={resetKpakpatoSession}
              className="flex items-center space-x-1 shadow-lg"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="text-xs">Reset</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={closeKpakpatoWidget}
              className="flex items-center space-x-1 shadow-lg"
            >
              <MicOff className="h-3 w-3" />
              <span className="text-xs">Stop</span>
            </Button>
          </div>
        )}
        
        {/* Widget ElevenLabs avec configuration complète */}
        <div onClick={handleWidgetClick}>
          <elevenlabs-convai
            ref={widgetRef}
            agent-id={agentId}
            server-location={serverLocation}
            variant={variant}
            action-text={actionText}
            start-call-text={startCallText}
            end-call-text={endCallText}
            dynamic-variables={getDynamicVariables()}
            auto-open={autoOpen}
            style={{
              display: "block",
              maxWidth: position === 'center' ? '520px' : '300px',
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Export des helpers pour utilisation externe
export const KpakpatoHelpers = {
  isAudioWorkletSupported,
  isSecureContext,
};

export default KpakpatoVoiceWidget;