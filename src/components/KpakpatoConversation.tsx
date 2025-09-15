import React, { useCallback, useEffect, useState } from 'react';
import { useConversation } from '@11labs/react';
import { toast } from 'sonner';

interface KpakpatoConversationProps {
  isActive: boolean;
  onStatusChange: (active: boolean) => void;
  onError: (error: string) => void;
}

// Agent ID - même que sur le site officiel ElevenLabs
const AGENT_ID = 'agent_6201k518xhz2eemtsrbf38fmjq7p';

export const KpakpatoConversation: React.FC<KpakpatoConversationProps> = ({
  isActive,
  onStatusChange,
  onError
}) => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Conversation connectée');
      onStatusChange(true);
      toast.success('🎤 Kpakpato est à l\'écoute !', {
        duration: 2000,
        position: 'bottom-center'
      });
    },
    
    onDisconnect: () => {
      console.log('📤 Conversation déconnectée');
      onStatusChange(false);
      setConversationId(null);
      toast.info('Conversation terminée', {
        duration: 1500,
        position: 'bottom-center'
      });
    },
    
    onMessage: (message) => {
      console.log('📨 Message reçu:', message);
    },
    
    onError: (error: any) => {
      console.error('❌ Erreur conversation:', error);
      const errorMessage = typeof error === 'string' ? error : (error?.message || error?.toString() || 'Erreur de conversation');
      onError(errorMessage);
      onStatusChange(false);
      
      // Messages d'erreur personnalisés
      if (errorMessage?.includes('microphone') || errorMessage?.includes('Micro')) {
        toast.error('🎤 Micro non accessible. Autorise le micro dans ton navigateur.', {
          duration: 4000,
          position: 'bottom-center'
        });
      } else if (errorMessage?.includes('network') || errorMessage?.includes('connection')) {
        toast.error('🌐 Erreur de connexion. Vérifie ta connexion internet.', {
          duration: 4000,
          position: 'bottom-center'
        });
      } else {
        toast.error(`❌ Erreur: ${errorMessage}`, {
          duration: 4000,
          position: 'bottom-center'
        });
      }
    }
  });

  // Génération d'URL signée pour agent public
  const generateSignedUrl = useCallback(async (): Promise<string> => {
    try {
      // Pour les agents publics, on peut accéder directement via WebSocket
      // L'URL sera construite par le SDK
      const publicUrl = `wss://api.us.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}&source=react_sdk&version=0.5.0`;
      return publicUrl;
    } catch (error) {
      console.error('❌ Erreur génération URL:', error);
      throw new Error('Impossible de générer l\'URL de conversation');
    }
  }, []);

  const startConversation = useCallback(async () => {
    try {
      console.log('🎤 Démarrage de la conversation...');
      
      // Vérifier la permission micro d'abord
      if (navigator?.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          // Arrêter immédiatement le stream de test
          stream.getTracks().forEach(track => track.stop());
        } catch (error: any) {
          if (error.name === 'NotAllowedError') {
            throw new Error('Accès au micro refusé. Autorise le micro dans ton navigateur.');
          } else if (error.name === 'NotFoundError') {
            throw new Error('Aucun microphone détecté. Vérifie tes périphériques audio.');
          }
          throw error;
        }
      }

      toast.info('Connexion à Kpakpato...', { 
        duration: 2000,
        position: 'bottom-center' 
      });

      // Générer l'URL signée si nécessaire
      if (!signedUrl) {
        const url = await generateSignedUrl();
        setSignedUrl(url);
      }

      // Démarrer la conversation avec l'agent public
      // Pour les agents publics, utiliser directement l'agentId
      const id = await conversation.startSession({
        agentId: AGENT_ID,
        // Fallback pour URL signée si nécessaire
        ...(signedUrl ? { signedUrl } : {})
      } as any);
      
      setConversationId(id);
      console.log('✅ Conversation démarrée avec ID:', id);
      
    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      onError(error.message || 'Impossible de démarrer la conversation');
      throw error;
    }
  }, [conversation, onError, signedUrl, generateSignedUrl]);

  const endConversation = useCallback(async () => {
    try {
      if (conversationId) {
        console.log('🛑 Arrêt de la conversation...');
        await conversation.endSession();
        setConversationId(null);
      }
    } catch (error: any) {
      console.warn('⚠️ Erreur arrêt conversation:', error);
      // On force la réinitialisation même en cas d'erreur
      setConversationId(null);
      onStatusChange(false);
    }
  }, [conversation, conversationId, onStatusChange]);

  // Gérer les changements d'état depuis le parent
  useEffect(() => {
    if (isActive && !conversationId) {
      startConversation().catch(console.error);
    } else if (!isActive && conversationId) {
      endConversation().catch(console.error);
    }
  }, [isActive, conversationId, startConversation, endConversation]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (conversationId) {
        conversation.endSession().catch(console.warn);
      }
    };
  }, [conversationId, conversation]);

  // Exposer les méthodes pour le contrôle externe
  useEffect(() => {
    (window as any).__kpakpatoConversation = {
      start: startConversation,
      end: endConversation,
      status: conversation.status,
      isSpeaking: conversation.isSpeaking
    };
  }, [startConversation, endConversation, conversation.status, conversation.isSpeaking]);

  return null; // Composant invisible qui gère juste la logique
};

export default KpakpatoConversation;