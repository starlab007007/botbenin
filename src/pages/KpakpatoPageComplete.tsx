import React, { useEffect, useState } from 'react';
import { Mic, Phone } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // ElevenLabs script is already loaded in index.html
    // Add a small delay to ensure the widget is ready
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

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
          {/* Central Voice Activation */}
          <div className="relative">
            {/* Animated background circle */}
            <div className="absolute inset-0 w-80 h-80 rounded-full bg-gradient-conic from-blue-500/20 via-purple-500/20 via-cyan-500/20 to-blue-500/20 animate-spin-slow" />
            
            {/* Voice interface container */}
            <div className="relative w-80 h-80 rounded-full bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-center">
              {/* ElevenLabs ConvAI Widget */}
              <div className="w-72 h-72 rounded-full overflow-hidden">
                <elevenlabs-convai 
                  agent-id="agent_5201k4wn52v7e8btj48v1636ys1e"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '50%',
                    background: 'transparent'
                  }}
                />
              </div>
              
              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-full">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">Initialisation de Jarvis...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status and Instructions */}
          <Card className="p-8 bg-card/50 backdrop-blur-md border-white/10 shadow-xl max-w-2xl w-full">
            <div className="text-center space-y-6">
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-primary">
                  Parlez à Jarvis
                </h3>
                <p className="text-muted-foreground">
                  Votre assistant vocal IA est prêt. Cliquez sur le bouton microphone ci-dessus pour commencer une conversation naturelle.
                </p>
              </div>
              
              {/* Quick tips */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
                    <Mic className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">Activez le micro</p>
                    <p className="text-muted-foreground text-xs">Cliquez pour parler</p>
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 animate-pulse" />
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">Parlez naturellement</p>
                    <p className="text-muted-foreground text-xs">Expression libre</p>
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto">
                    <Phone className="w-6 h-6 text-cyan-500" />
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">Écoutez Jarvis</p>
                    <p className="text-muted-foreground text-xs">Réponse vocale</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
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