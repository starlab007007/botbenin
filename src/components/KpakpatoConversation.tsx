import React, { useCallback, useEffect, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useConversation } from '@11labs/react';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Utiliser le hook officiel ElevenLabs
  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Conversation ElevenLabs connectée');
      setShowChatWindow(true);
      setHasError(false);
      toast.success('🎤 Kpakpato est connecté !', {
        duration: 2000,
        position: 'bottom-center'
      });
      addMessage('agent', 'Salut ! Je suis Kpakpato, votre assistant IA. Vous pouvez me parler !');
    },
    onDisconnect: () => {
      console.log('📞 Conversation fermée');
      setShowChatWindow(false);
      setConversationId(null);
    },
    onMessage: (message) => {
      console.log('📨 Message reçu:', message);
      
      // L'API ElevenLabs React retourne des objets différents
      if (message.message && message.source === 'ai') {
        addMessage('agent', message.message);
      } else if (message.message && message.source === 'user') {
        addMessage('user', message.message);
      }
    },
    onError: (error) => {
      console.error('❌ Erreur conversation:', error);
      setHasError(true);
      onError(`Erreur conversation: ${error || 'Erreur inconnue'}`);
      toast.error('Erreur de connexion', {
        duration: 3000,
        position: 'bottom-center'
      });
    }
  });

  // Demander les permissions microphone
  const requestMicrophonePermission = useCallback(async () => {
    try {
      console.log('🎙️ Demande permissions microphone...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
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

  // Obtenir l'URL signée depuis notre edge function
  const getSignedUrl = useCallback(async (): Promise<string> => {
    try {
      console.log('🔑 Génération URL signée...');
      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url', {
        body: { agentId: AGENT_ID }
      });

      if (error) throw error;
      
      if (!data?.signed_url) {
        throw new Error('URL signée non reçue');
      }

      console.log('✅ URL signée générée');
      return data.signed_url;
    } catch (error) {
      console.error('❌ Erreur génération URL signée:', error);
      throw new Error('Impossible de générer l\'URL de connexion');
    }
  }, []);

  // Fonction principale pour démarrer la conversation
  const startConversation = useCallback(async () => {
    if (isLoading || conversation.status === 'connected') return;
    
    setIsLoading(true);
    setHasError(false);
    
    try {
      console.log('🚀 === DÉMARRAGE CONVERSATION KPAKPATO ===');

      // Vérification des permissions microphone
      const granted = await requestMicrophonePermission();
      if (!granted) {
        setIsLoading(false);
        return;
      }

      // Obtenir l'URL signée
      const signedUrl = await getSignedUrl();
      console.log('🔗 URL signée obtenue');

      // Démarrer la conversation avec l'URL signée
      console.log('🌐 Connexion à ElevenLabs avec URL signée...');
      const sessionId = await conversation.startSession({ 
        signedUrl: signedUrl
      });
      
      console.log('✅ Session démarrée:', sessionId);
      setConversationId(sessionId);
      
    } catch (error) {
      console.error('❌ Erreur démarrage conversation:', error);
      setHasError(true);
      onError(error instanceof Error ? error.message : 'Erreur inconnue');
      toast.error('Impossible de démarrer la conversation', {
        duration: 3000,
        position: 'bottom-center'
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, conversation, requestMicrophonePermission, getSignedUrl, onError]);

  // Arrêter la conversation
  const stopConversation = useCallback(async () => {
    console.log('🛑 Arrêt de la conversation');
    
    try {
      if (conversation.status === 'connected') {
        await conversation.endSession();
        console.log('✅ Session fermée proprement');
      }
    } catch (error) {
      console.error('❌ Erreur fermeture session:', error);
    }
    
    setShowChatWindow(false);
    setConversationId(null);
    setMessages([]);
    setHasError(false);
    
    onToggle();
  }, [conversation, onToggle]);

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    const element = document.querySelector('[data-messages-end]');
    element?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Toggle de la conversation
  const handleToggle = useCallback(() => {
    if (isActive && conversation.status === 'connected') {
      stopConversation();
    } else if (!isActive) {
      onToggle();
    }
  }, [isActive, conversation.status, stopConversation, onToggle]);

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
            {conversation.status !== 'connected' ? (
              <div className="flex flex-col items-center space-y-2">
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
                {hasError && (
                  <p className="text-xs text-destructive text-center">
                    Erreur de connexion. Réessayez.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {conversation.isSpeaking ? (
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
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div data-messages-end />
              </ScrollArea>

              {/* Info */}
              <div className="text-center text-xs text-muted-foreground">
                Parlez directement ou touchez le microphone pour commencer
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KpakpatoConversation;