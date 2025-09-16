import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const AGENT_ID = 'agent_6201k518xhz2eemtsrbf38fmjq7p'; // Agent Kpakpato officiel

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showChatWindow, setShowChatWindow] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Ajouter un message à la conversation
  const addMessage = useCallback((type: 'user' | 'agent', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Auto-scroll vers le bas
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Envoyer un message texte (via contextual update pour ne pas interrompre)
  const sendTextMessage = useCallback((text: string) => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Format ElevenLabs pour message texte
      const message = {
        user_message: text.trim()
      };
      
      console.log('📤 Envoi message texte:', message);
      wsRef.current.send(JSON.stringify(message));
      
      // Ajouter le message à l'interface
      addMessage('user', text.trim());
      setTextInput('');
      
      toast.success('Message envoyé', {
        duration: 1000,
        position: 'bottom-center'
      });
    } catch (error) {
      console.error('❌ Erreur envoi message texte:', error);
      toast.error('Erreur envoi message');
    }
  }, [addMessage]);

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

      // === GESTIONNAIRES WEBSOCKET OPTIMISÉS ===
      
      wsRef.current.onopen = () => {
        console.log('🎉 === WEBSOCKET OUVERT ===');
        console.log('📊 État WebSocket:', {
          readyState: wsRef.current?.readyState,
          protocol: wsRef.current?.protocol,
          url: wsRef.current?.url?.substring(0, 50) + '...'
        });
        
        setIsConnected(true);
        setShowChatWindow(true);
        
        toast.success('🎤 Kpakpato est connecté !', {
          duration: 2000,
          position: 'bottom-center'
        });
        
        console.log('✅ En attente du message d\'initialisation du serveur...');
      };

      wsRef.current.onmessage = (event) => {
        try {
          console.log('📨 Message reçu, taille:', event.data.length);
          const message = JSON.parse(event.data);
          console.log('📊 Type de message:', message.type);
          
          if (message.type === 'conversation_initiation_metadata') {
            console.log('🎬 Conversation initialisée par le serveur');
            addMessage('agent', 'Salut ! Je suis Kpakpato, votre assistant IA. Vous pouvez me parler ou m\'écrire !');
            
            // MAINTENANT démarrer l'enregistrement audio
            setTimeout(() => {
              try {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
                  console.log('🎤 Démarrage de l\'enregistrement après initialisation...');
                  mediaRecorderRef.current.start(250); // 250ms chunks
                  console.log('✅ Enregistrement démarré');
                }
              } catch (error) {
                console.error('❌ Erreur enregistrement:', error);
              }
            }, 500);
            
          } else if (message.type === 'audio') {
            console.log('🔊 Audio reçu');
            if (message.audio_event?.audio_base_64) {
              setIsSpeaking(true);
              playAudioResponse(message.audio_event.audio_base_64);
            }
          } else if (message.type === 'user_transcript') {
            const transcript = message.user_transcription_event?.user_transcript?.trim();
            if (transcript) {
              console.log('📝 Transcription utilisateur:', transcript);
              addMessage('user', transcript);
            }
          } else if (message.type === 'agent_response') {
            const response = message.agent_response_event?.agent_response?.trim();
            if (response) {
              console.log('🤖 Réponse agent:', response);
              addMessage('agent', response);
            }
          } else if (message.type === 'agent_response_correction') {
            const correction = message.agent_response_correction_event?.corrected_agent_response?.trim();
            if (correction) {
              console.log('🔧 Correction:', correction);
              addMessage('agent', correction);
            }
          } else if (message.type === 'interruption') {
            console.log('⏸️ Interruption');
            setIsSpeaking(false);
          } else if (message.type === 'ping') {
            console.log('🏓 Ping reçu');
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'pong',
                event_id: message.ping_event?.event_id
              }));
            }
          } else {
            console.log('❓ Message inconnu:', message.type);
          }
        } catch (error) {
          console.error('❌ Erreur parsing message:', error);
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
        console.log('📞 WebSocket fermé - Code:', event.code, 'Raison:', event.reason);
        
        // Diagnostics détaillés des codes d'erreur
        const errorMessages = {
          1000: 'Fermeture normale',
          1001: 'Endpoint parti', 
          1002: 'Erreur de protocole - Format de message invalide',
          1003: 'Données non supportées - Problème avec l\'audio',
          1006: 'Connexion fermée anormalement - Problème réseau',
          1011: 'Erreur serveur ElevenLabs',
          4000: 'Erreur d\'authentification ElevenLabs',
          4001: 'Agent non trouvé ou inactif',
          4002: 'Quota ElevenLabs dépassé',
          4003: 'Permissions insuffisantes'
        };
        
        const reason = errorMessages[event.code as keyof typeof errorMessages] || `Code inconnu: ${event.code}`;
        console.log('🔍 Diagnostic:', reason);
        
        if (event.reason) {
          console.log('🔍 Détail serveur:', event.reason);
        }
        
        setIsConnected(false);
        setIsSpeaking(false);
        setShowChatWindow(false);
        
        // Arrêter l'enregistrement si actif
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            mediaRecorderRef.current.stop();
          } catch (error) {
            console.log('Info: MediaRecorder déjà arrêté');
          }
        }
        
        if (event.code !== 1000) {
          toast.error(`Connexion fermée: ${reason}`, {
            duration: 4000,
            position: 'bottom-center'
          });
        }
      };

      // === CONFIGURATION ENVOI AUDIO ===
      console.log('🎤 Configuration callbacks MediaRecorder...');
      
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const base64 = (reader.result as string).split(',')[1];
                wsRef.current?.send(JSON.stringify({
                  user_audio_chunk: base64
                }));
              } catch (error) {
                console.error('❌ Erreur envoi audio:', error);
              }
            };
            
            reader.onerror = (error) => {
              console.error('❌ Erreur FileReader:', error);
            };
            
            reader.readAsDataURL(event.data);
          } else {
            console.log('⚠️ Chunk audio ignoré - WebSocket pas ouvert ou chunk vide');
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
    setShowChatWindow(false);
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
    <>
      {/* Fenêtre de chat */}
      {showChatWindow && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] z-[9998]">
          <Card className="w-full h-full shadow-2xl border-2 border-primary/20">
            <CardHeader className="pb-3 bg-primary/5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Conversation avec Kpakpato
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Mic className={`w-4 h-4 ${isSpeaking ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                  <Button
                    onClick={handleToggleConversation}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 flex flex-col h-[calc(100%-80px)]">
              {/* Zone des messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground ml-4'
                            : 'bg-muted text-foreground mr-4'
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {/* Zone de saisie */}
              <div className="p-4 border-t bg-background/50">
                <div className="flex gap-2">
                  <Input
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendTextMessage(textInput);
                      }
                    }}
                    placeholder="Écrivez votre message..."
                    className="flex-1 text-sm"
                    disabled={!isConnected}
                  />
                  <Button
                    onClick={() => sendTextMessage(textInput)}
                    disabled={!textInput.trim() || !isConnected}
                    size="sm"
                    className="px-3"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {isSpeaking ? '🎤 Kpakpato parle...' : '💬 Vous pouvez parler ou écrire'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bouton flottant principal */}
      <div className={`fixed bottom-6 right-6 z-[9999] ${showChatWindow ? 'opacity-0 pointer-events-none' : ''}`}>
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
      </div>
    </>
  );
};

export default KpakpatoConversation;