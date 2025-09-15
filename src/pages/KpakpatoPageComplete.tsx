import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWebhookNotification } from '@/hooks/useWebhookNotification';
import { useConversation } from '@11labs/react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': {
        'agent-id': string;
        style?: React.CSSProperties;
      };
    }
  }
}

export const KpakpatoPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [showStartButton, setShowStartButton] = useState(false);
  const { sendWebhook, isLoading: webhookLoading } = useWebhookNotification();
  
  const conversation = useConversation({
    onConnect: () => {
      console.log('🎤 ConvAI connected');
      setIsConversationActive(true);
      sendWebhook({
        action: 'convai_connected',
        agentId: 'agent_6201k518xhz2eemtsrbf38fmjq7p',
        timestamp: new Date().toISOString(),
        userId: 'user_' + Date.now(),
        data: { status: 'connected', source: 'react_sdk' }
      });
    },
    onDisconnect: () => {
      console.log('🔴 ConvAI disconnected');
      setIsConversationActive(false);
      setShowStartButton(true);
      sendWebhook({
        action: 'convai_disconnected',
        agentId: 'agent_6201k518xhz2eemtsrbf38fmjq7p',
        timestamp: new Date().toISOString(),
        userId: 'user_' + Date.now(),
        data: { status: 'disconnected', source: 'react_sdk' }
      });
    },
    onMessage: (message) => {
      console.log('📨 ConvAI message:', message);
    },
    onError: (error) => {
      console.error('❌ ConvAI error:', error);
    }
  });

  useEffect(() => {
    // Initialize and show start button after a delay
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowStartButton(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleStartConversation = async () => {
    setShowStartButton(false);
    
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start conversation using React SDK
      const conversationId = await conversation.startSession({
        agentId: 'agent_6201k518xhz2eemtsrbf38fmjq7p'
      });
      
      console.log('🎤 Conversation started with ID:', conversationId);
      
      // Send webhook notification that conversation started
      const webhookSuccess = await sendWebhook({
        action: 'conversation_started',
        agentId: 'agent_6201k518xhz2eemtsrbf38fmjq7p',
        timestamp: new Date().toISOString(),
        userId: 'user_' + Date.now(),
        data: {
          conversationId,
          sessionId: 'session_' + Date.now(),
          platform: 'web',
          userAgent: navigator.userAgent,
          page: window.location.href
        }
      });

      console.log('🔄 Webhook notification:', webhookSuccess ? '✅ Sent' : '❌ Failed');
    } catch (error) {
      console.error('❌ Conversation start error:', error);
      setShowStartButton(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 animate-pulse" />
      
      <div className="relative z-10 container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="relative mx-auto w-32 h-32 mb-8">
            {/* Outer glow rings */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-cyan-500/30 animate-ping" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-r from-purple-500/40 to-blue-500/40 animate-pulse" />
            
            {/* Main AI core */}
            <div className="absolute inset-8 rounded-full bg-gradient-conic from-blue-500 via-purple-500 via-cyan-500 to-blue-500 animate-spin-slow flex items-center justify-center shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center">
                <Mic className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent mb-4 animate-pulse">
            Jarvis
          </h1>
          <div className="text-xl text-muted-foreground mb-4">
            Assistant Vocal Intelligence Artificielle
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500 animate-pulse" />
            <span className="text-muted-foreground">En ligne et prêt à vous écouter</span>
          </div>
        </div>

        {/* Main Voice Interface */}
        <div className="flex flex-col items-center justify-center space-y-8">
          {/* Visual Ring Interface */}
          <div className="relative w-60 h-60">
            {/* Background rings for visual effect */}
            <div className={cn(
              "absolute inset-0 w-60 h-60 rounded-full border-2 animate-pulse pointer-events-none transition-colors duration-500",
              isConversationActive ? "border-green-400/60" : "border-purple-300/40"
            )} />
            <div className={cn(
              "absolute inset-4 w-52 h-52 rounded-full border-2 animate-pulse pointer-events-none transition-colors duration-500",
              isConversationActive ? "border-blue-400/60" : "border-blue-300/40"
            )} style={{ animationDelay: '0.5s' }} />
            <div className={cn(
              "absolute inset-8 w-44 h-44 rounded-full border-2 animate-pulse pointer-events-none transition-colors duration-500",
              isConversationActive ? "border-cyan-400/60" : "border-cyan-300/40"
            )} style={{ animationDelay: '1s' }} />
            
            {/* Glowing center */}
            <div className={cn(
              "absolute inset-16 w-28 h-28 rounded-full animate-pulse flex items-center justify-center pointer-events-none transition-all duration-500",
              isConversationActive ? 
                "bg-gradient-to-r from-green-500/30 via-blue-500/30 to-cyan-500/30" :
                "bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20"
            )}>
              {isConversationActive ? (
                <Volume2 className="w-8 h-8 text-green-400 animate-pulse" />
              ) : (
                <Mic className="w-8 h-8 text-primary animate-pulse" />
              )}
            </div>
            
            {/* Conversation Status Indicator */}
            <div className={cn(
              "absolute inset-0 w-60 h-60 rounded-full overflow-hidden transition-all duration-500 flex items-center justify-center",
              isConversationActive 
                ? "opacity-100 pointer-events-auto z-50" 
                : "opacity-0 pointer-events-none z-0"
            )}>
              <div className="w-32 h-32 rounded-full bg-gradient-to-r from-green-500/30 via-blue-500/30 to-cyan-500/30 animate-pulse flex items-center justify-center">
                <Volume2 className="w-10 h-10 text-green-400 animate-pulse" />
              </div>
            </div>
            
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-full z-10 pointer-events-none">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-3 border-purple-200 border-t-purple-500 animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">Initialisation de Jarvis...</p>
                </div>
              </div>
            )}
          </div>

          {/* Start Conversation Button */}
          {showStartButton && !isConversationActive && (
            <div className="text-center space-y-6 animate-fade-in">
              <Button
                onClick={handleStartConversation}
                size="lg"
                className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                disabled={webhookLoading}
              >
                <Mic className="w-5 h-5 mr-2" />
                {webhookLoading ? 'Connexion...' : 'Démarrer la conversation'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Cliquez pour commencer à parler avec Jarvis
              </p>
            </div>
          )}

          {/* Active Conversation Status */}
          {isConversationActive && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                <span className="text-lg font-medium text-foreground">Conversation active</span>
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              </div>
              <p className="text-muted-foreground">
                Jarvis vous écoute - Parlez maintenant
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    // End conversation using React SDK
                    await conversation.endSession();
                    
                    // Send webhook for conversation end
                    await sendWebhook({
                      action: 'conversation_ended',
                      agentId: 'agent_6201k518xhz2eemtsrbf38fmjq7p',
                      timestamp: new Date().toISOString(),
                      userId: 'user_' + Date.now(),
                      data: { reason: 'user_stop' }
                    });
                  } catch (error) {
                    console.error('❌ Error ending conversation:', error);
                  }
                }}
                className="text-sm"
                disabled={webhookLoading}
              >
                <MicOff className="w-4 h-4 mr-2" />
                Arrêter la conversation
              </Button>
            </div>
          )}

          {/* Call to Action (when not started) */}
          {!showStartButton && !isConversationActive && !isLoading && (
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-foreground">
                Jarvis est prêt
              </h3>
              <p className="text-muted-foreground max-w-md">
                Votre assistant vocal intelligent est maintenant disponible
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 space-y-2">
          <p className="text-xs text-muted-foreground/75">
            Alimenté par ElevenLabs Conversational AI
          </p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">Interface vocale avancée</span>
          </div>
        </div>
      </div>

      {/* Enhanced CSS Animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
        .bg-gradient-conic {
          background: conic-gradient(from 0deg, var(--tw-gradient-stops));
        }
        
        /* ElevenLabs widget styling */
        elevenlabs-convai {
          border-radius: 50% !important;
          overflow: hidden !important;
        }
        
        /* Ensure the widget blends with our design */
        elevenlabs-convai iframe {
          border-radius: 50% !important;
        }
        
        @keyframes glow-pulse {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3),
                        0 0 40px rgba(147, 51, 234, 0.2),
                        0 0 60px rgba(6, 182, 212, 0.1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.5),
                        0 0 60px rgba(147, 51, 234, 0.3),
                        0 0 90px rgba(6, 182, 212, 0.2);
          }
        }
        
        .animate-glow {
          animation: glow-pulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};