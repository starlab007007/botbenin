import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

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
  const [isInitialized, setIsInitialized] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Demander les permissions microphone
  const requestMicrophonePermission = useCallback(async () => {
    try {
      console.log('🎙️ Demande permissions microphone...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermissions(true);
      console.log('✅ Permissions accordées');
      return true;
    } catch (error) {
      console.error('❌ Permissions refusées:', error);
      onError('Permissions microphone requises pour utiliser Kpakpato');
      return false;
    }
  }, [onError]);

  // Ajouter un message à la conversation
  const addMessage = useCallback((type: 'user' | 'agent', content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  }, []);

  // Jouer la réponse audio de l'agent
  const playAudioResponse = useCallback(async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) return;
      
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
      };
      
      source.start(0);
    } catch (error) {
      console.error('❌ Erreur lecture audio:', error);
      setIsSpeaking(false);
    }
  }, []);

  // Envoyer un message texte
  const sendTextMessage = useCallback(async (text: string) => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Format EXACT selon documentation ElevenLabs
      const contextualUpdate = {
        type: "contextual_update",
        text: text.trim()
      };
      
      console.log('📤 Envoi message texte:', contextualUpdate);
      wsRef.current.send(JSON.stringify(contextualUpdate));
      
      // Ajouter à l'interface
      addMessage('user', text.trim());
      setTextInput('');
    } catch (error) {
      console.error('❌ Erreur envoi texte:', error);
      onError('Impossible d\'envoyer le message');
    }
  }, [addMessage, onError]);

  // Fonction principale pour démarrer la conversation
  const startConversation = useCallback(async () => {
    if (isLoading || isConnected) return;
    
    setIsLoading(true);
    
    try {
      console.log('🚀 === DÉMARRAGE CONVERSATION KPAKPATO ===');

      // Vérification des permissions
      if (!hasPermissions) {
        const granted = await requestMicrophonePermission();
        if (!granted) {
          setIsLoading(false);
          return;
        }
      }

      // Créer AudioContext
      console.log('🔊 Création AudioContext...');
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      console.log('✅ AudioContext prêt:', audioContextRef.current.state);

      // Obtenir le stream audio
      console.log('🎤 Configuration stream audio...');
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

      // Configurer MediaRecorder
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 16000
      });
      
      console.log('✅ MediaRecorder configuré:', mimeType);

      // CONNEXION WEBSOCKET DIRECTE selon documentation officielle
      console.log('🌐 Connexion WebSocket directe à ElevenLabs...');
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;
      console.log('🔗 URL:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      // === GESTIONNAIRES WEBSOCKET ===
      
      wsRef.current.onopen = () => {
        console.log('🎉 WebSocket connecté à ElevenLabs');
        setIsConnected(true);
        setShowChatWindow(true);
        
        toast.success('🎤 Kpakpato est connecté !', {
          duration: 2000,
          position: 'bottom-center'
        });
        
        // Pour un agent public, la connexion se fait automatiquement
        console.log('✅ Agent public prêt - pas d\'initialisation manuelle nécessaire');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Message reçu:', message.type);
          
          if (message.type === 'conversation_initiation_metadata') {
            console.log('🎬 Conversation initialisée par ElevenLabs');
            setIsInitialized(true);
            addMessage('agent', 'Salut ! Je suis Kpakpato, votre assistant IA. Vous pouvez me parler ou m\'écrire !');
            
            // Démarrer l'enregistrement MAINTENANT
            setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
                console.log('🎤 Démarrage enregistrement...');
                mediaRecorderRef.current.start(200);
                console.log('✅ Enregistrement actif');
              }
            }, 100);
            
          } else if (message.type === 'audio') {
            if (message.audio_event?.audio_base_64) {
              console.log('🔊 Réception audio agent');
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
              console.log('🔧 Correction agent:', correction);
              addMessage('agent', correction);
            }
          } else if (message.type === 'interruption') {
            console.log('⏸️ Interruption détectée');
            setIsSpeaking(false);
          } else if (message.type === 'ping') {
            console.log('🏓 Ping reçu, envoi pong...');
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              const pongMessage = {
                type: 'pong',
                event_id: message.ping_event?.event_id
              };
              wsRef.current.send(JSON.stringify(pongMessage));
              console.log('🏓 Pong envoyé');
            }
          } else {
            console.log('❓ Message non traité:', message.type);
          }
        } catch (error) {
          console.error('❌ Erreur parsing message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('💥 Erreur WebSocket:', error);
        onError('Erreur de connexion WebSocket');
      };

      wsRef.current.onclose = (event) => {
        console.log('📞 WebSocket fermé - Code:', event.code, 'Raison:', event.reason);
        
        const errorMessages: { [key: number]: string } = {
          1000: 'Fermeture normale',
          1001: 'Endpoint parti', 
          1002: 'Erreur de protocole - Format de message invalide',
          1003: 'Données non supportées - Problème avec l\'audio',
          1006: 'Connexion fermée anormalement - Problème réseau',
          1008: 'Violation de politique - Format de message incorrect',
          1011: 'Erreur serveur ElevenLabs',
          4000: 'Erreur d\'authentification ElevenLabs',
          4001: 'Agent non trouvé ou inactif',
          4002: 'Quota ElevenLabs dépassé',
          4003: 'Permissions insuffisantes'
        };
        
        const reason = errorMessages[event.code] || `Code inconnu: ${event.code}`;
        console.log('🔍 Diagnostic:', reason);
        
        setIsConnected(false);
        setIsSpeaking(false);
        setShowChatWindow(false);
        setIsInitialized(false);
        
        // Arrêter l'enregistrement
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

      // === CONFIGURATION CALLBACKS MEDIARECORDER ===
      
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN && isInitialized) {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const base64 = (reader.result as string).split(',')[1];
                // Format EXACT selon doc ElevenLabs
                const audioMessage = {
                  user_audio_chunk: base64
                };
                wsRef.current?.send(JSON.stringify(audioMessage));
                console.log('🎤 Chunk audio envoyé');
              } catch (error) {
                console.error('❌ Erreur envoi audio:', error);
              }
            };
            reader.readAsDataURL(event.data);
          }
        };
        
        mediaRecorderRef.current.onstart = () => {
          console.log('▶️ Enregistrement démarré');
        };
        
        mediaRecorderRef.current.onstop = () => {
          console.log('⏹️ Enregistrement arrêté');
        };
      }
      
    } catch (error) {
      console.error('❌ Erreur démarrage conversation:', error);
      onError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isConnected, hasPermissions, requestMicrophonePermission, addMessage, playAudioResponse, onError, isInitialized]);

  // Arrêter la conversation
  const stopConversation = useCallback(() => {
    console.log('🛑 Arrêt de la conversation');
    
    // Fermer WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Conversation terminée par l\'utilisateur');
      wsRef.current = null;
    }
    
    // Arrêter MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.log('Info: MediaRecorder déjà arrêté');
      }
    }
    
    // Fermer AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Arrêter le stream audio
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    setIsConnected(false);
    setIsSpeaking(false);
    setShowChatWindow(false);
    setIsInitialized(false);
    setMessages([]);
    
    onToggle();
  }, [onToggle]);

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Toggle de la conversation
  const handleToggle = useCallback(() => {
    if (isActive && isConnected) {
      stopConversation();
    } else if (!isActive) {
      onToggle();
    }
  }, [isActive, isConnected, stopConversation, onToggle]);

  // Gérer l'envoi de message texte
  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && isConnected) {
      sendTextMessage(textInput.trim());
    }
  }, [textInput, isConnected, sendTextMessage]);

  if (!isActive) {
    return (
      <div className="fixed bottom-4 right-4">
        <Button
          onClick={handleToggle}
          size="lg"
          className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90 shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md h-[600px] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">🤖 Kpakpato</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleToggle}>
            ✕
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col space-y-4">
          {/* Zone de contrôle */}
          <div className="flex items-center justify-center space-x-4">
            {!isConnected ? (
              <Button
                onClick={startConversation}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Connexion...</span>
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    <span>Parler à Kpakpato</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {isSpeaking ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                      <span className="text-sm">Kpakpato parle...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Mic className="h-4 w-4" />
                      <span className="text-sm">À l'écoute</span>
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={stopConversation}
                  variant="destructive"
                  size="sm"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Fenêtre de chat */}
          {showChatWindow && (
            <>
              <ScrollArea className="flex-1 border rounded-lg p-3">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-2 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Zone de saisie texte */}
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Tapez votre message..."
                  disabled={!isConnected}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!textInput.trim() || !isConnected}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
          
          {!hasPermissions && !isConnected && (
            <div className="text-center text-sm text-muted-foreground">
              <p>🎙️ Permissions microphone requises</p>
              <p>Cliquez sur "Parler à Kpakpato" pour commencer</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KpakpatoConversation;