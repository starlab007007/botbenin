import React, { useState, useRef, useEffect } from 'react';
import { Bot, Mic, MicOff, Send, Volume2, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { elevenLabsService } from '@/services/elevenLabsService';
import { useWebhook } from '@/hooks/useWebhook';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export const KpakpatoPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isRecording, isProcessing: voiceProcessing, startRecording, stopRecording, audioBlob } = useVoiceRecording();
  const { sendToWebhook, setWebhookUrl: updateWebhookUrl } = useWebhook();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    updateWebhookUrl(webhookUrl);
  }, [webhookUrl, updateWebhookUrl]);

  const addMessage = (content: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const processVoiceInput = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      // Transcribe audio
      const transcription = await elevenLabsService.transcribeAudio(audioBlob);
      if (transcription.text) {
        addMessage(transcription.text, true);
        await processMessage(transcription.text);
      }
    } catch (error) {
      toast({
        title: "Erreur de transcription",
        description: "Impossible de transcrire l'audio",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processMessage = async (message: string) => {
    try {
      // Send to webhook if configured
      if (webhookUrl) {
        const response = await sendToWebhook(message);
        if (response?.message) {
          addMessage(response.message, false);
          // Synthesize and play response
          await elevenLabsService.playText(response.message);
        }
      } else {
        // Fallback response if no webhook
        const fallbackResponse = "Je suis Jarvis, votre assistant IA. Configurez un webhook pour des réponses personnalisées.";
        addMessage(fallbackResponse, false);
        await elevenLabsService.playText(fallbackResponse);
      }
    } catch (error) {
      toast({
        title: "Erreur de traitement",
        description: "Impossible de traiter votre message",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (audioBlob) {
      processVoiceInput();
    }
  }, [audioBlob]);

  const handleVoiceToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    addMessage(textInput, true);
    await processMessage(textInput);
    setTextInput('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="relative mx-auto w-20 h-20 mb-4">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl animate-float">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          
          <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-2">
            Jarvis
          </h1>
          <div className="text-sm text-muted-foreground mb-2">
            Assistant Vocal Intelligence Artificielle
          </div>
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <div className={cn("w-2 h-2 rounded-full bg-primary animate-pulse")} />
            <span>IA Conversationnelle Activée</span>
          </div>
        </div>

        {/* Settings */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="mb-2 text-muted-foreground hover:text-primary"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configuration
          </Button>
          
          {showSettings && (
            <Card className="p-4 mb-4 bg-card/90 backdrop-blur-md">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  URL du Webhook (optionnel)
                </label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://votre-webhook.com/endpoint"
                  className="bg-background/50"
                />
                <p className="text-xs text-muted-foreground">
                  Configurez un webhook pour des réponses personnalisées de Jarvis
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Chat Interface */}
        <Card className="mb-4 p-0 min-h-[500px] shadow-2xl border-0 bg-card/90 backdrop-blur-md overflow-hidden">
          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[400px] space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Bonjour, je suis Jarvis</p>
                <p className="text-sm">Cliquez sur le microphone ou tapez un message pour commencer</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start space-x-3 animate-fade-in",
                    message.isUser ? "flex-row-reverse space-x-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    message.isUser 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-gradient-to-br from-primary/20 to-primary/40"
                  )}>
                    {message.isUser ? (
                      <div className="w-4 h-4 rounded-full bg-current" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className={cn(
                    "flex-1 max-w-xs p-4 rounded-2xl shadow-sm",
                    message.isUser
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted/50 text-foreground rounded-bl-sm"
                  )}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={cn(
                      "text-xs mt-2 opacity-60",
                      message.isUser ? "text-primary-foreground/60" : "text-muted-foreground"
                    )}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {(isProcessing || voiceProcessing) && (
              <div className="flex items-center space-x-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="bg-muted/50 p-4 rounded-2xl rounded-bl-sm">
                  <p className="text-sm text-muted-foreground">
                    Jarvis réfléchit...
                  </p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t bg-card/50 backdrop-blur-sm">
            <form onSubmit={handleTextSubmit} className="flex items-center space-x-4">
              {/* Voice Button */}
              <Button
                type="button"
                onClick={handleVoiceToggle}
                disabled={voiceProcessing || isProcessing}
                className={cn(
                  "w-12 h-12 rounded-full transition-all duration-300",
                  isRecording 
                    ? "bg-destructive hover:bg-destructive/90 animate-pulse" 
                    : "bg-primary hover:bg-primary/90"
                )}
              >
                {isRecording ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>

              {/* Text Input */}
              <div className="flex-1 relative">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Tapez votre message à Jarvis..."
                  disabled={isProcessing || voiceProcessing}
                  className="pr-12 bg-background/50 border-muted/50 focus:border-primary/50"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!textInput.trim() || isProcessing || voiceProcessing}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
            
            {/* Status */}
            <div className="flex items-center justify-center mt-3 text-xs text-muted-foreground">
              {isRecording && <span className="text-destructive">🔴 Enregistrement en cours...</span>}
              {voiceProcessing && <span className="text-primary">⚡ Transcription...</span>}
              {isProcessing && <span className="text-primary">🤖 Jarvis traite votre demande...</span>}
              {!isRecording && !voiceProcessing && !isProcessing && (
                <span>Prêt à vous écouter</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};