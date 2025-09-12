import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Bot, User, Loader, Volume2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useWebhook } from '@/hooks/useWebhook';
import { elevenLabsService } from '@/services/elevenLabsService';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string;
}

export const KpakpatoPage: React.FC = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPlayingResponse, setIsPlayingResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const { isRecording, isProcessing, startRecording, stopRecording, audioBlob } = useVoiceRecording();
  const { sendToWebhook, isLoading: webhookLoading } = useWebhook();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Process audio when recording stops
  useEffect(() => {
    if (audioBlob && !isRecording) {
      handleAudioProcessing();
    }
  }, [audioBlob, isRecording]);

  const handleAudioProcessing = async () => {
    if (!audioBlob) return;

    try {
      // Transcribe audio
      const { text } = await elevenLabsService.transcribeAudio(audioBlob);
      
      if (!text.trim()) {
        toast({
          title: "Aucun texte détecté",
          description: "Essayez de parler plus clairement",
          variant: "destructive",
        });
        return;
      }

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        content: text,
        isUser: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Send to webhook and get response
      const webhookResponse = await sendToWebhook(text);
      
      if (webhookResponse?.message) {
        // Generate audio for response
        let audioUrl: string | undefined;
        try {
          const { audioUrl: responseAudioUrl } = await elevenLabsService.synthesizeText(
            webhookResponse.message
          );
          audioUrl = responseAudioUrl;
        } catch (audioError) {
          console.warn('Audio synthesis failed, using text only:', audioError);
        }

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: webhookResponse.message,
          isUser: false,
          timestamp: new Date(),
          audioUrl
        };
        
        setMessages(prev => [...prev, botMessage]);

        // Auto-play response if audio is available
        if (audioUrl) {
          playAudio(audioUrl);
        }
      }
      
    } catch (error) {
      console.error('Audio processing error:', error);
      toast({
        title: "Erreur de traitement",
        description: "Impossible de traiter votre message vocal",
        variant: "destructive",
      });
    }
  };

  const playAudio = async (audioUrl: string) => {
    try {
      // Stop current audio if playing
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      setIsPlayingResponse(true);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsPlayingResponse(false);
        currentAudioRef.current = null;
      };
      
      audio.onerror = () => {
        setIsPlayingResponse(false);
        currentAudioRef.current = null;
        toast({
          title: "Erreur audio",
          description: "Impossible de lire la réponse audio",
          variant: "destructive",
        });
      };

      await audio.play();
    } catch (error) {
      setIsPlayingResponse(false);
      console.error('Audio playback error:', error);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const isLoading = isProcessing || webhookLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="relative mx-auto w-24 h-24 mb-6">
            {/* Animated rings */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl animate-float">
              <Bot className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          
          <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-3">
            Jarvis
          </h1>
          <div className="text-lg text-muted-foreground mb-2">
            Assistant Vocal Intelligence Artificielle
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <div className={cn("w-2 h-2 rounded-full", isRecording ? "bg-destructive animate-pulse" : "bg-primary")} />
            <span>
              {isRecording 
                ? "En écoute..." 
                : isLoading 
                ? "Traitement..." 
                : "Prêt à vous écouter"
              }
            </span>
          </div>
        </div>

        {/* Chat Interface */}
        <Card className="mb-8 p-6 min-h-[500px] max-h-[600px] overflow-hidden shadow-2xl border-0 bg-card/90 backdrop-blur-md">
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground animate-fade-in">
                    <div className="relative mx-auto w-16 h-16 mb-4">
                      <Bot className="w-16 h-16 opacity-30 animate-float" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Bonjour ! Je suis Jarvis</h3>
                    <p className="text-base mb-1">Votre assistant vocal intelligent</p>
                    <p className="text-sm opacity-75">Maintenez le microphone pour me parler</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-start space-x-4 animate-slide-up",
                      message.isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!message.isUser && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                        <Bot className="w-5 h-5 text-primary-foreground" />
                      </div>
                    )}
                    
                    <div className={cn("max-w-[75%] group")}>
                      <div
                        className={cn(
                          "p-4 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl",
                          message.isUser
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-card border rounded-bl-sm"
                        )}
                      >
                        <p className="text-sm leading-relaxed mb-2">{message.content}</p>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          
                          {message.audioUrl && !message.isUser && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => playAudio(message.audioUrl!)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            >
                              <Volume2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {message.isUser && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center shadow-lg">
                        <User className="w-5 h-5 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex items-start space-x-4 animate-slide-up">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="bg-card border p-4 rounded-2xl rounded-bl-sm shadow-lg">
                    <div className="flex items-center space-x-3">
                      <Loader className="w-4 h-4 animate-spin" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce animation-delay-150" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce animation-delay-300" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </Card>

        {/* Voice Control */}
        <div className="flex justify-center items-center space-x-4">
          <div className="relative">
            {/* Animated rings when recording */}
            {isRecording && (
              <>
                <div className="absolute -inset-4 rounded-full bg-destructive/30 animate-ping" />
                <div className="absolute -inset-2 rounded-full bg-destructive/20 animate-ping animation-delay-150" />
                <div className="absolute -inset-1 rounded-full bg-destructive/10 animate-ping animation-delay-300" />
              </>
            )}
            
            <Button
              onClick={handleMicClick}
              disabled={isLoading}
              size="lg"
              className={cn(
                "w-24 h-24 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95",
                isRecording 
                  ? "bg-destructive hover:bg-destructive/90 animate-pulse-glow" 
                  : "bg-gradient-to-br from-primary to-primary/70 hover:from-primary/90 hover:to-primary/60",
                isLoading && "opacity-50 cursor-not-allowed scale-95"
              )}
            >
              {isLoading ? (
                <Loader className="w-10 h-10 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-10 h-10" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </Button>
          </div>

          {/* Audio status indicator */}
          {isPlayingResponse && (
            <div className="flex items-center space-x-2 text-primary animate-fade-in">
              <Volume2 className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-medium">Jarvis parle...</span>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            {isRecording 
              ? "🔴 Enregistrement en cours - Relâchez pour envoyer" 
              : isLoading 
              ? "⚡ Jarvis analyse votre message..." 
              : "🎤 Maintenez enfoncé pour parler à Jarvis"
            }
          </p>
          
          {messages.length > 0 && (
            <p className="text-xs text-muted-foreground opacity-75">
              {messages.length} message{messages.length > 1 ? 's' : ''} échangé{messages.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Custom CSS */}
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--primary)) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--primary) / 0.3);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.5);
        }
        
        .animation-delay-150 {
          animation-delay: 150ms;
        }
        
        .animation-delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
};