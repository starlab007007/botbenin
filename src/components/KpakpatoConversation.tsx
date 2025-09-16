import React, { useCallback, useEffect, useState } from 'react';
import { useConversation } from '@11labs/react';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const AGENT_ID = 'agent_6201k518xhz2eemtsrbf38fmjq7p';

interface KpakpatoConversationProps {
  isActive: boolean;
  onToggle: () => void;
  onError: (error: string) => void;
}

export const KpakpatoConversation: React.FC<KpakpatoConversationProps> = ({
  isActive,
  onToggle,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Conversation connectée');
      toast.success('🎤 Kpakpato est connecté !', {
        duration: 2000,
        position: 'bottom-center'
      });
    },
    onDisconnect: () => {
      console.log('📞 Conversation déconnectée');
      toast.info('Conversation terminée', {
        duration: 1500,
        position: 'bottom-center'
      });
    },
    onError: (error) => {
      console.error('❌ Erreur conversation:', error);
      const errorMessage = String(error);
      onError(errorMessage);
      toast.error('❌ Erreur de conversation', {
        duration: 3000,
        position: 'bottom-center'
      });
    },
    onMessage: (message) => {
      console.log('💬 Message reçu:', message);
    },
  });

  // Demander les permissions microphone au premier clic
  const requestMicrophonePermission = useCallback(async () => {
    try {
      console.log('🎙️ Demande des permissions microphone...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermissions(true);
      console.log('✅ Permissions microphone accordées');
      return true;
    } catch (error: any) {
      console.error('❌ Permissions refusées:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('🎤 Accès au microphone refusé. Autorise le micro dans ton navigateur.', {
          duration: 4000,
          position: 'bottom-center'
        });
      } else if (error.name === 'NotFoundError') {
        toast.error('🎤 Aucun microphone détecté. Vérifie tes périphériques audio.', {
          duration: 4000,
          position: 'bottom-center'
        });
      } else {
        toast.error('❌ Erreur d\'accès au microphone', {
          duration: 3000,
          position: 'bottom-center'
        });
      }
      onError('Permissions microphone refusées');
      return false;
    }
  }, [onError]);

  const handleToggleConversation = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      if (!isActive) {
        // Démarrer la conversation
        console.log('🚀 Démarrage de la conversation...');

        // Vérifier/demander les permissions d'abord
        if (!hasPermissions) {
          const granted = await requestMicrophonePermission();
          if (!granted) {
            return;
          }
        }

        toast.info('Initialisation de Kpakpato…', {
          duration: 2000,
          position: 'bottom-center'
        });

        // Démarrer la session avec l'agent public
        await conversation.startSession({
          signedUrl: `https://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`,
        });

        onToggle();
      } else {
        // Arrêter la conversation
        console.log('🛑 Arrêt de la conversation...');
        await conversation.endSession();
        onToggle();
      }
    } catch (error: any) {
      console.error('❌ Erreur toggle conversation:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      onError(errorMessage);

      if (errorMessage.includes('Agent not found') || errorMessage.includes('404')) {
        toast.error('❌ Agent Kpakpato non trouvé. Vérifie la configuration.', {
          duration: 4000,
          position: 'bottom-center'
        });
      } else if (errorMessage.includes('permission') || errorMessage.includes('microphone')) {
        toast.error('🎤 Problème d\'accès au microphone', {
          duration: 4000,
          position: 'bottom-center'
        });
      } else {
        toast.error(`❌ Erreur: ${errorMessage}`, {
          duration: 4000,
          position: 'bottom-center'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isActive, hasPermissions, conversation, onToggle, onError, requestMicrophonePermission]);

  // Nettoyage automatique
  useEffect(() => {
    return () => {
      if (conversation.status === 'connected') {
        conversation.endSession().catch(console.warn);
      }
    };
  }, [conversation]);

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <Button
        onClick={handleToggleConversation}
        disabled={isLoading}
        className={`
          rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 
          focus:outline-none focus:ring-4 focus:ring-offset-2 min-w-[60px] min-h-[60px]
          ${isConnected 
            ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground focus:ring-destructive/50' 
            : 'bg-primary hover:bg-primary/90 text-primary-foreground focus:ring-primary/50'
          }
          ${isSpeaking ? 'animate-pulse' : ''}
        `}
        size="lg"
        aria-pressed={isConnected}
        aria-label={isConnected ? 'Arrêter Kpakpato' : 'Parler avec Kpakpato'}
      >
        <div className="flex items-center gap-3 px-2 py-1">
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isConnected ? (
            <PhoneOff className="w-6 h-6" />
          ) : (
            <Phone className="w-6 h-6" />
          )}
          
          <span className="font-semibold text-sm sm:text-base hidden sm:inline">
            {isLoading 
              ? 'Connexion…' 
              : isConnected 
                ? 'Raccrocher' 
                : 'Appeler Kpakpato'
            }
          </span>
          
          {/* Indicateur visuel sur mobile */}
          <div className="sm:hidden">
            <div className={`w-3 h-3 rounded-full ${
              isConnected 
                ? isSpeaking 
                  ? 'bg-yellow-400 animate-pulse' 
                  : 'bg-red-400 animate-pulse'
                : 'bg-green-400'
            }`} />
          </div>
        </div>
      </Button>

      {/* Indicateur de statut vocal */}
      {isConnected && (
        <div className="absolute -top-2 -left-2 bg-background border-2 border-primary rounded-full p-1">
          <Mic className={`w-4 h-4 ${isSpeaking ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
        </div>
      )}
    </div>
  );
};

export default KpakpatoConversation;