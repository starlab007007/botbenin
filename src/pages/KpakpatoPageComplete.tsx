import React, { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
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
          {/* ElevenLabs ConvAI Widget - Positioned and Clickable */}
          <div className="relative w-60 h-60">
            {/* Background rings for visual effect */}
            <div className="absolute inset-0 w-60 h-60 rounded-full border-2 border-purple-300/40 animate-pulse pointer-events-none" />
            <div className="absolute inset-4 w-52 h-52 rounded-full border-2 border-blue-300/40 animate-pulse pointer-events-none" style={{ animationDelay: '0.5s' }} />
            <div className="absolute inset-8 w-44 h-44 rounded-full border-2 border-cyan-300/40 animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
            
            {/* Glowing center */}
            <div className="absolute inset-16 w-28 h-28 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 animate-pulse flex items-center justify-center pointer-events-none">
              <Mic className="w-8 h-8 text-primary animate-pulse" />
            </div>
            
            {/* ElevenLabs ConvAI Widget - Positioned on top and clickable */}
            <div className="absolute inset-0 w-60 h-60 rounded-full z-20 pointer-events-auto overflow-hidden">
              <elevenlabs-convai 
                agent-id="agent_5201k4wn52v7e8btj48v1636ys1e"
                style={{
                  display: 'block',
                  width: '240px',
                  height: '240px',
                  border: 'none',
                  borderRadius: '50%'
                }}
              />
            </div>

            {/* Click-through helper (fallback) */}
            <button
              type="button"
              aria-label="Démarrer la conversation"
              className="absolute inset-0 z-30 bg-transparent focus:outline-none"
              onClick={() => {
                const el = document.querySelector('elevenlabs-convai') as HTMLElement | null;
                el?.click();
              }}
            >
              <span className="sr-only">Démarrer la conversation</span>
            </button>
            
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

          {/* Call to Action */}
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold text-foreground">
              Démarrer une conversation
            </h3>
            <p className="text-muted-foreground max-w-md">
              Cliquez sur le bouton ci-dessus pour commencer à parler avec Jarvis
            </p>
          </div>
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