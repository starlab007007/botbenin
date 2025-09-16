import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
      console.log('🔑 Génération du signed URL...');
      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url', {
        body: { agentId: AGENT_ID }
      });

      console.log('📡 Réponse de la fonction:', { data, error });

      if (error) {
        console.error('❌ Erreur de la fonction:', error);
        throw new Error(`Erreur fonction: ${error.message}`);
      }

      if (!data?.signedUrl) {
        console.error('❌ Pas de signedUrl dans la réponse:', data);
        throw new Error('Impossible de générer le lien signé. Vérifiez votre clé API ElevenLabs.');
      }

      const { signedUrl } = data;
      console.log('✅ Signed URL généré:', signedUrl?.substring(0, 100) + '...');

      // Créer AudioContext avec gestion des erreurs
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000
        });
        
        // Reprendre le contexte audio si suspendu
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        
        console.log('✅ AudioContext créé:', audioContextRef.current.state);
      } catch (error) {
        console.error('❌ Erreur AudioContext:', error);
        throw new Error('Impossible d\'initialiser l\'audio. Vérifiez vos paramètres navigateur.');
      }
      
      // Obtenir le stream audio avec paramètres optimisés
      console.log('🎤 Demande d\'accès au microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1
        } 
      });
      audioStreamRef.current = stream;
      console.log('✅ Stream audio obtenu');

      // Configurer MediaRecorder avec paramètres optimisés
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 48000
        });
        console.log('✅ MediaRecorder configuré');
      } catch (error) {
        console.error('❌ Erreur MediaRecorder:', error);
        throw new Error('Format audio non supporté par votre navigateur.');
      }

      // Établir connexion WebSocket avec l'URL signée
      console.log('🌐 Connexion WebSocket...');
      wsRef.current = new WebSocket(signedUrl, ['convai']);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connecté');
        setIsConnected(true);
        
        // OBLIGATOIRE: Envoyer l'initialisation de conversation selon la doc ElevenLabs
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          console.log('📤 Envoi de l\'initialisation de conversation...');
          wsRef.current.send(JSON.stringify({
            type: "conversation_initiation_client_data"
          }));
        }
        
        toast.success('🎤 Kpakpato est connecté !', {
          duration: 2000,
          position: 'bottom-center'
        });
        
        // Démarrer l'enregistrement après initialisation
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
            console.log('🎤 Démarrage de l\'enregistrement...');
            mediaRecorderRef.current.start(100); // Envoi toutes les 100ms
          }
        }, 500);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('💬 Message WebSocket reçu:', data);
          
          // Gestion des ping/pong (OBLIGATOIRE selon la doc)
          if (data.type === "ping") {
            console.log('🏓 Ping reçu, envoi du pong...');
            const pongDelay = data.ping_event?.ping_ms || 0;
            setTimeout(() => {
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: "pong",
                  event_id: data.ping_event.event_id
                }));
                console.log('🏓 Pong envoyé');
              }
            }, pongDelay);
            return;
          }
          
          // Gestion des transcriptions utilisateur
          if (data.type === "user_transcript") {
            console.log('🗣️ Transcription utilisateur:', data.user_transcription_event?.user_transcript);
            return;
          }
          
          // Gestion des réponses de l'agent (texte)
          if (data.type === "agent_response") {
            console.log('🤖 Réponse agent:', data.agent_response_event?.agent_response);
            return;
          }
          
          // Gestion des corrections de réponse
          if (data.type === "agent_response_correction") {
            console.log('🔄 Correction agent:', data.agent_response_correction_event?.corrected_agent_response);
            return;
          }
          
          // Gestion de l'audio (FORMAT CORRECT selon la doc)
          if (data.type === "audio") {
            console.log('🔊 Audio reçu, event_id:', data.audio_event?.event_id);
            setIsSpeaking(true);
            
            if (data.audio_event?.audio_base_64) {
              playAudioResponse(data.audio_event.audio_base_64);
            }
            return;
          }
          
          // Gestion des interruptions
          if (data.type === "interruption") {
            console.log('⛔ Interruption:', data.interruption_event?.reason);
            setIsSpeaking(false);
            return;
          }
          
          console.log('❓ Type de message non géré:', data.type);
          
        } catch (error) {
          console.error('❌ Erreur parsing message WebSocket:', error);
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

      // Configurer l'envoi d'audio (FORMAT CORRECT selon la doc ElevenLabs)
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('🎤 Envoi chunk audio, taille:', event.data.size, 'bytes');
            
            // Convertir en base64 selon le format ElevenLabs
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              
              // FORMAT CORRECT selon la documentation officielle
              const message = {
                user_audio_chunk: base64
              };
              
              wsRef.current?.send(JSON.stringify(message));
              console.log('📤 Chunk audio envoyé');
            };
            reader.readAsDataURL(event.data);
          } else {
            console.log('⚠️ Chunk audio ignoré - WebSocket pas prêt ou chunk vide');
          }
        };
        
        console.log('✅ MediaRecorder configuré avec callbacks');
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