import React, { useCallback, useEffect, useState, useRef } from 'react';
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
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

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

  const playAudioResponse = useCallback(async (audioBase64: string) => {
    try {
      if (!audioContextRef.current) return;
      
      const audioData = atob(audioBase64);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
      };
      
      source.start();
    } catch (error) {
      console.error('❌ Erreur lecture audio:', error);
      setIsSpeaking(false);
    }
  }, []);

  const startConversation = useCallback(async () => {
    try {
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

      // Générer signed URL avec la clé API ElevenLabs
      const response = await fetch('/api/elevenlabs/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentId: AGENT_ID })
      });

      if (!response.ok) {
        throw new Error('Impossible de générer le lien signé. Vérifiez votre clé API ElevenLabs.');
      }

      const { signedUrl } = await response.json();

      // Créer AudioContext
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Obtenir le stream audio
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      audioStreamRef.current = stream;

      // Configurer MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      // Établir connexion WebSocket avec l'URL signée
      wsRef.current = new WebSocket(signedUrl, ['convai']);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connecté');
        setIsConnected(true);
        toast.success('🎤 Kpakpato est connecté !', {
          duration: 2000,
          position: 'bottom-center'
        });
        
        // Démarrer l'enregistrement
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
          mediaRecorderRef.current.start(100); // Envoi toutes les 100ms
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('💬 Message reçu:', data);
          
          if (data.type === 'audio') {
            // Traiter l'audio reçu
            setIsSpeaking(true);
            playAudioResponse(data.audio);
          } else if (data.type === 'message') {
            console.log('📝 Transcription:', data.text);
          }
        } catch (error) {
          console.error('❌ Erreur parsing message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        onError('Erreur de connexion WebSocket');
      };

      wsRef.current.onclose = () => {
        console.log('📞 WebSocket fermé');
        setIsConnected(false);
        setIsSpeaking(false);
        toast.info('Conversation terminée', {
          duration: 1500,
          position: 'bottom-center'
        });
      };

      // Configurer l'envoi d'audio
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            // Convertir en base64 et envoyer
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              wsRef.current?.send(JSON.stringify({
                type: 'audio',
                audio: base64
              }));
            };
            reader.readAsDataURL(event.data);
          }
        };
      }

    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      onError(errorMessage);
      
      if (errorMessage.includes('Permission')) {
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
    }
  }, [hasPermissions, requestMicrophonePermission, onError, playAudioResponse]);

  const stopConversation = useCallback(() => {
    console.log('🛑 Arrêt de la conversation...');
    
    // Arrêter l'enregistrement
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Fermer le stream audio
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    // Fermer AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Fermer WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsSpeaking(false);
  }, []);

  const handleToggleConversation = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      if (!isActive) {
        await startConversation();
        onToggle();
      } else {
        stopConversation();
        onToggle();
      }
    } catch (error: any) {
      console.error('❌ Erreur toggle conversation:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isActive, isLoading, startConversation, stopConversation, onToggle, onError]);

  // Nettoyage automatique
  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, [stopConversation]);

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