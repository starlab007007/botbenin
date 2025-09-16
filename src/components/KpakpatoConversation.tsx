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
      console.log('🚀 === DÉBUT CONVERSATION KPAKPATO ===');
      console.log('🔍 État initial:', { 
        isActive, 
        hasPermissions, 
        isConnected,
        wsState: wsRef.current?.readyState 
      });
      
      // Vérifier/demander les permissions d'abord
      if (!hasPermissions) {
        console.log('🎤 Demande des permissions microphone...');
        const granted = await requestMicrophonePermission();
        if (!granted) {
          console.log('❌ Permissions refusées');
          return;
        }
      }

      toast.info('Initialisation de Kpakpato…', {
        duration: 2000,
        position: 'bottom-center'
      });

      // Nettoyer les connexions précédentes
      if (wsRef.current) {
        console.log('🧹 Nettoyage connexion précédente...');
        wsRef.current.close();
        wsRef.current = null;
      }

      // Générer signed URL avec la clé API ElevenLabs
      console.log('🔑 Génération du signed URL...');
      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url', {
        body: { agentId: AGENT_ID }
      });

      console.log('📡 Réponse signed URL:', { 
        success: !!data?.signedUrl, 
        hasError: !!error,
        errorMsg: error?.message 
      });

      if (error) {
        console.error('❌ Erreur signed URL:', error);
        throw new Error(`Erreur fonction: ${error.message}`);
      }

      if (!data?.signedUrl) {
        console.error('❌ Pas de signedUrl:', data);
        throw new Error('Impossible de générer le lien signé. Vérifiez votre clé API ElevenLabs.');
      }

      const { signedUrl } = data;
      console.log('✅ Signed URL généré:', {
        length: signedUrl.length,
        preview: signedUrl.substring(0, 80) + '...',
        hasAgent: signedUrl.includes(AGENT_ID)
      });

      // Créer AudioContext avec gestion des erreurs
      try {
        console.log('🔊 Création AudioContext...');
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000
        });
        
        // Reprendre le contexte audio si suspendu
        if (audioContextRef.current.state === 'suspended') {
          console.log('▶️ Reprise AudioContext suspendu...');
          await audioContextRef.current.resume();
        }
        
        console.log('✅ AudioContext:', {
          state: audioContextRef.current.state,
          sampleRate: audioContextRef.current.sampleRate
        });
      } catch (error) {
        console.error('❌ Erreur AudioContext:', error);
        throw new Error('Impossible d\'initialiser l\'audio. Vérifiez vos paramètres navigateur.');
      }
      
      // Obtenir le stream audio avec paramètres optimisés
      console.log('🎤 Demande stream audio...');
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
      
      const tracks = stream.getAudioTracks();
      console.log('✅ Stream audio:', {
        active: stream.active,
        trackCount: tracks.length,
        trackSettings: tracks[0]?.getSettings()
      });

      // Configurer MediaRecorder avec paramètres optimisés
      try {
        console.log('📼 Configuration MediaRecorder...');
        
        // Essayer différents formats audio compatibles
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = ''; // Utiliser le format par défaut
            }
          }
        }
        
        const mediaRecorderOptions: MediaRecorderOptions = {
          audioBitsPerSecond: 16000
        };
        
        if (mimeType) {
          mediaRecorderOptions.mimeType = mimeType;
        }
        
        mediaRecorderRef.current = new MediaRecorder(stream, mediaRecorderOptions);
        
        console.log('✅ MediaRecorder:', {
          state: mediaRecorderRef.current.state,
          mimeType: mediaRecorderRef.current.mimeType
        });
      } catch (error) {
        console.error('❌ Erreur MediaRecorder:', error);
        throw new Error('Format audio non supporté par votre navigateur.');
      }

      // Établir connexion WebSocket avec l'URL signée
      console.log('🌐 === CONNEXION WEBSOCKET ===');
      console.log('🔗 URL WebSocket:', signedUrl.substring(0, 100) + '...');
      
      // Créer WebSocket avec gestion d'erreur détaillée
      wsRef.current = new WebSocket(signedUrl);
      
      // Log de l'état initial
      console.log('📡 WebSocket créé:', {
        readyState: wsRef.current.readyState,
        protocol: wsRef.current.protocol,
        url: wsRef.current.url?.substring(0, 100) + '...'
      });

      // === GESTIONNAIRES WEBSOCKET AVEC DIAGNOSTICS DÉTAILLÉS ===
      
      wsRef.current.onopen = () => {
        console.log('🎉 === WEBSOCKET OUVERT ===');
        console.log('📊 État WebSocket:', {
          readyState: wsRef.current?.readyState,
          protocol: wsRef.current?.protocol,
          extensions: wsRef.current?.extensions
        });
        
        setIsConnected(true);
        
        toast.success('🎤 Kpakpato est connecté !', {
          duration: 2000,
          position: 'bottom-center'
        });
        
        // Démarrer l'enregistrement après connexion
        setTimeout(() => {
          try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
              console.log('🎤 Démarrage de l\'enregistrement...');
              mediaRecorderRef.current.start(100);
              console.log('✅ Enregistrement démarré');
            }
          } catch (error) {
            console.error('❌ Erreur démarrage enregistrement:', error);
          }
        }, 200);
      };

      wsRef.current.onmessage = (event) => {
        try {
          console.log('📨 === MESSAGE REÇU ===');
          const message = JSON.parse(event.data);
          console.log('📊 Type:', message.type);
          console.log('📊 Contenu:', message);
          
          // Gérer tous les types de messages ElevenLabs
          if (message.type === 'conversation_initiation_metadata') {
            console.log('🎬 Métadonnées conversation OK');
          } else if (message.type === 'audio_event') {
            console.log('🔊 Audio reçu du bot');
            if (message.audio_base_64) {
              setIsSpeaking(true);
              playAudioResponse(message.audio_base_64);
            }
          } else if (message.type === 'user_transcript') {
            console.log('📝 Transcription:', message.text);
          } else if (message.type === 'agent_response_event') {
            console.log('🤖 Réponse agent:', message.text);
          } else if (message.type === 'interruption') {
            console.log('⏸️ Interruption');
            setIsSpeaking(false);
          } else if (message.type === 'ping') {
            console.log('🏓 Ping -> Pong');
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'pong' }));
            }
          } else {
            console.log('❓ Type inconnu:', message.type, message);
          }
        } catch (error) {
          console.error('❌ Erreur message:', error);
          console.log('📄 Raw event data:', event.data);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('💥 === ERREUR WEBSOCKET ===');
        console.error('📊 Détails erreur:', {
          error: error,
          readyState: wsRef.current?.readyState,
          timestamp: new Date().toISOString()
        });
        
        // Log des détails de connexion pour debug
        console.error('🔍 Debug connexion:', {
          signedUrlLength: signedUrl?.length,
          agentId: AGENT_ID,
          hasConvaiProtocol: wsRef.current?.protocol === 'convai'
        });
        
        onError('Erreur de connexion WebSocket - Vérifiez votre connexion internet et les permissions ElevenLabs');
      };

      wsRef.current.onclose = (event) => {
        console.log('📞 === WEBSOCKET FERMÉ ===');
        console.log('📊 Détails fermeture:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          timestamp: new Date().toISOString()
        });
        
        // Analyser les codes de fermeture avec plus de détails
        let closeReason = 'Connexion fermée';
        if (event.code === 1000) {
          closeReason = 'Fermeture normale';
        } else if (event.code === 1001) {
          closeReason = 'Endpoint parti (navigateur fermé)';
        } else if (event.code === 1002) {
          closeReason = 'Erreur de protocole - Vérifiez le format des messages';
        } else if (event.code === 1003) {
          closeReason = 'Données non supportées - Problème format audio';
        } else if (event.code === 1006) {
          closeReason = 'Connexion fermée anormalement - Vérifiez votre connexion';
        } else if (event.code === 1011) {
          closeReason = 'Erreur serveur ElevenLabs';
        } else if (event.code >= 4000) {
          closeReason = `Erreur ElevenLabs spécifique: ${event.reason || 'Code ' + event.code}`;
        }
        
        console.log('🔍 Raison fermeture:', closeReason);
        console.log('🔍 Contexte fermeture:', {
          hadSentInit: 'Vérifiez si l\'initialisation a été envoyée',
          hasPermissions: hasPermissions,
          isConnectedBefore: isConnected
        });
        
        setIsConnected(false);
        setIsSpeaking(false);
        
        if (event.code !== 1000) {
          toast.error(`Connexion fermée: ${closeReason}`, {
            duration: 5000,
            position: 'bottom-center'
          });
        } else {
          toast.info('Conversation terminée', {
            duration: 1500,
            position: 'bottom-center'
          });
        }
      };

      // === CONFIGURATION ENVOI AUDIO ===
      console.log('🎤 Configuration callbacks MediaRecorder...');
      
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = (event) => {
          const chunkSize = event.data.size;
          const wsState = wsRef.current?.readyState;
          
          console.log('🎤 Chunk audio reçu:', {
            size: chunkSize,
            wsState: wsState,
            wsOpen: wsState === WebSocket.OPEN
          });
          
          if (chunkSize > 0 && wsState === WebSocket.OPEN) {
            console.log('📤 Traitement chunk audio...');
            
            // Convertir en base64 selon le format ElevenLabs
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const base64 = (reader.result as string).split(',')[1];
                
                // FORMAT CORRECT selon ElevenLabs ConvAI
                const message = {
                  type: "audio",
                  data: base64
                };
                
                console.log('📤 Envoi chunk:', {
                  base64Length: base64.length,
                  messageKeys: Object.keys(message)
                });
                
                wsRef.current?.send(JSON.stringify(message));
                console.log('✅ Chunk audio envoyé avec succès');
              } catch (error) {
                console.error('❌ Erreur envoi chunk:', error);
              }
            };
            
            reader.onerror = (error) => {
              console.error('❌ Erreur FileReader:', error);
            };
            
            reader.readAsDataURL(event.data);
          } else {
            console.log('⚠️ Chunk audio ignoré:', {
              reason: chunkSize === 0 ? 'chunk vide' : 'WebSocket pas ouvert',
              chunkSize,
              wsState
            });
          }
        };
        
        mediaRecorderRef.current.onstart = () => {
          console.log('▶️ MediaRecorder démarré');
        };
        
        mediaRecorderRef.current.onstop = () => {
          console.log('⏹️ MediaRecorder arrêté');
        };
        
        mediaRecorderRef.current.onerror = (event) => {
          console.error('❌ Erreur MediaRecorder:', event);
        };
        
        console.log('✅ Callbacks MediaRecorder configurés');
      } else {
        console.error('❌ MediaRecorder non disponible pour configuration callbacks');
      }
      
      console.log('🎯 === CONFIGURATION TERMINÉE ===');

    } catch (error: any) {
      console.error('💥 === ERREUR GÉNÉRALE ===');
      console.error('📊 Détails erreur:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack?.substring(0, 200),
        timestamp: new Date().toISOString()
      });
      
      const errorMessage = error?.message || 'Erreur inconnue';
      onError(errorMessage);
      
      if (errorMessage.includes('Permission')) {
        toast.error('🎤 Problème d\'accès au microphone', {
          duration: 4000,
          position: 'bottom-center'
        });
      } else if (errorMessage.includes('WebSocket') || errorMessage.includes('connexion')) {
        toast.error('🌐 Problème de connexion réseau', {
          duration: 4000,
          position: 'bottom-center'
        });
      } else if (errorMessage.includes('API')) {
        toast.error('🔑 Problème avec l\'API ElevenLabs', {
          duration: 4000,
          position: 'bottom-center'
        });
      } else {
        toast.error(`❌ Erreur: ${errorMessage}`, {
          duration: 4000,
          position: 'bottom-center'
        });
      }
      
      // Nettoyer en cas d'erreur
      try {
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
      } catch (cleanupError) {
        console.error('❌ Erreur nettoyage:', cleanupError);
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