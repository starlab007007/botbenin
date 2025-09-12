import React, { useEffect } from 'react';
import { Bot } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  useEffect(() => {
    // Load ElevenLabs ConvAI widget script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    
    document.head.appendChild(script);
    
    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

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
            <div className={cn("w-2 h-2 rounded-full bg-primary animate-pulse")} />
            <span>Conversational AI activé</span>
          </div>
        </div>

        {/* ElevenLabs ConvAI Widget Container */}
        <Card className="mb-8 p-6 min-h-[600px] shadow-2xl border-0 bg-card/90 backdrop-blur-md">
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl">
              <elevenlabs-convai 
                agent-id="agent_5201k4wn52v7e8btj48v1636ys1e"
                style={{
                  width: '100%',
                  height: '500px',
                  border: 'none',
                  borderRadius: '16px'
                }}
              />
            </div>
            
            {/* Loading fallback */}
            <div className="text-center text-muted-foreground mt-4">
              <p className="text-sm">Chargement de l'interface conversationnelle...</p>
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <div className="text-center space-y-4">
          <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border">
            <h3 className="text-xl font-semibold mb-3 text-primary">
              Comment utiliser Jarvis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <span className="text-primary font-bold">1</span>
                </div>
                <p className="font-medium">Cliquez sur le microphone</p>
                <p className="text-xs opacity-75">Activez votre microphone pour commencer</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <span className="text-primary font-bold">2</span>
                </div>
                <p className="font-medium">Parlez naturellement</p>
                <p className="text-xs opacity-75">Exprimez votre demande clairement</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <span className="text-primary font-bold">3</span>
                </div>
                <p className="font-medium">Écoutez la réponse</p>
                <p className="text-xs opacity-75">Jarvis vous répondra vocalement</p>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground opacity-75">
            Powered by ElevenLabs Conversational AI
          </p>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        elevenlabs-convai {
          border-radius: 16px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
        }
      `}</style>
    </div>
  );
};