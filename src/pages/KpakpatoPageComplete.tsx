import React, { useState } from 'react';

// Déclaration TypeScript pour l'élément personnalisé ElevenLabs
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': {
        'agent-id': string;
        variant?: string;
        'action-text'?: string;
        'start-call-text'?: string;
        'end-call-text'?: string;
        'listening-text'?: string;
        'speaking-text'?: string;
      } & React.HTMLAttributes<HTMLElement>;
    }
  }
}

export const KpakpatoPage: React.FC = () => {
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);

  const handleToggleConversation = () => {
    setIsConversationActive(!isConversationActive);
  };

  const handleConversationError = (error: string) => {
    setConversationError(error);
    console.error('Erreur Kpakpato:', error);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 animate-pulse" />
      
      <div className="relative z-10 container mx-auto px-4 py-10 max-w-3xl">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-in">
          <div className="relative mx-auto w-32 h-32 mb-8">
            {/* Outer glow rings */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-cyan-500/30 animate-ping" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-r from-purple-500/40 to-blue-500/40 animate-pulse" />
            
            {/* Main AI core */}
            <div className="absolute inset-8 rounded-full bg-gradient-conic from-blue-500 via-purple-500 via-cyan-500 to-blue-500 animate-spin-slow flex items-center justify-center shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-primary animate-pulse" />
              </div>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent mb-4">
            Kpakpato – Agent IA
          </h1>
          <p className="text-xl text-muted-foreground mb-4">
            Cliquez sur le bouton pour{" "}
            <strong>appeler l'agent IA</strong> et discuter en français.
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500 animate-pulse" />
            <span className="text-muted-foreground">En ligne et prêt à vous écouter</span>
          </div>
        </header>

        {/* Instructions principales */}
        <div className="rounded-2xl shadow-sm border bg-card/70 backdrop-blur-sm p-8 text-center">
          <div className="space-y-6">
            <div className="text-lg text-muted-foreground">
              <p className="mb-4">
                Utilisez le <strong className="text-primary">bouton flottant</strong> en bas à droite 
                pour démarrer une conversation vocale avec Kpakpato.
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm bg-muted/50 rounded-lg p-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Cliquez, autorisez le micro, et commencez à parler !</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-sm text-muted-foreground">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <p>Cliquez sur le bouton flottant</p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 font-bold">2</span>
                </div>
                <p>Autorisez l'accès au micro</p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                  <span className="text-cyan-600 font-bold">3</span>
                </div>
                <p>Commencez la conversation</p>
              </div>
            </div>
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

      {/* Widget vocal ElevenLabs officiel - CDN direct */}
      <elevenlabs-convai
        agent-id="agent_6201k518xhz2eemtsrbf38fmjq7p"
        variant="expanded"
        action-text="Parler à l'IA"
        start-call-text="Commencer la conversation"
        end-call-text="Terminer"
        listening-text="J'écoute…"
        speaking-text="L'agent parle"
      />

      {/* Affichage des erreurs */}
      {conversationError && (
        <div className="fixed bottom-4 left-4 max-w-sm p-4 bg-destructive text-destructive-foreground rounded-lg shadow-lg z-40">
          <p className="text-sm">{conversationError}</p>
        </div>
      )}

      {/* Enhanced CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
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
          
          /* Option : forcer le widget à passer au-dessus d'autres overlays */
          elevenlabs-convai {
            --elv-z-index: 30;
          }
          
          /* Styling personnalisé du widget */
          elevenlabs-convai {
            border-radius: 12px !important;
            overflow: hidden !important;
          }
          
          elevenlabs-convai iframe {
            border-radius: 12px !important;
          }
          
          @keyframes fade-in {
            from { 
              opacity: 0; 
              transform: translateY(20px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
          
          .animate-fade-in {
            animation: fade-in 0.8s ease-out;
          }
        `
      }} />
    </main>
  );
};