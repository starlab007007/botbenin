import React, { useEffect, useState } from 'react';
import { usePersonalAgents } from '@/hooks/usePersonalAgents';
import { useSearchParams } from 'react-router-dom';

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

export const WidgetPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { fetchSharedAgent } = usePersonalAgents();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const agentId = searchParams.get('agent');

  useEffect(() => {
    const loadAgent = async () => {
      if (agentId) {
        try {
          const agentData = await fetchSharedAgent(agentId);
          setAgent(agentData);
        } catch (error) {
          console.error('Erreur lors du chargement de l\'agent:', error);
        }
      }
      setLoading(false);
    };

    loadAgent();
  }, [agentId, fetchSharedAgent]);

  useEffect(() => {
    // Charger le script ElevenLabs
    if (!document.querySelector('script[src*="elevenlabs"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      script.async = true;
      script.type = 'text/javascript';
      document.head.appendChild(script);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/10 to-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de l'agent IA...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/10 to-background">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-destructive text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Agent introuvable</h1>
          <p className="text-muted-foreground">
            L'agent IA demandé n'existe pas ou n'est plus disponible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 animate-pulse" />
      
      <div className="relative z-10 container mx-auto px-4 py-10 max-w-4xl">
        {/* Header minimaliste */}
        <header className="text-center mb-8">
          <div className="relative mx-auto w-20 h-20 mb-6">
            {/* AI core simplifié */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-cyan-500/30 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-r from-purple-500/40 to-blue-500/40 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-gradient-conic from-blue-500 via-purple-500 via-cyan-500 to-blue-500 animate-spin-slow flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent mb-2">
            {agent.name}
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            Agent IA Conversationnel
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-green-500 animate-pulse" />
            <span className="text-muted-foreground">En ligne et prêt à vous écouter</span>
          </div>
        </header>

        {/* Instructions */}
        <div className="text-center mb-8">
          <p className="text-muted-foreground mb-4">
            Cliquez sur le bouton ci-dessous pour démarrer une conversation vocale avec l'agent IA.
          </p>
          <div className="inline-flex items-center space-x-2 text-sm bg-muted/50 rounded-lg px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Autorisez le micro et commencez à parler !</span>
          </div>
        </div>

        {/* Widget ElevenLabs centré */}
        <div className="flex justify-center">
          <elevenlabs-convai
            agent-id={agent.elevenlabs_agent_id}
            variant={agent.widget_config?.variant || 'expanded'}
            action-text={agent.widget_config?.actionText || 'Nouvel appel'}
            start-call-text={agent.widget_config?.startCallText || 'Démarrer la conversation'}
            end-call-text={agent.widget_config?.endCallText || 'Terminer la conversation'}
            listening-text={agent.widget_config?.listeningText || 'J\'écoute…'}
            speaking-text={agent.widget_config?.speakingText || 'L\'agent vous parle'}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-12 space-y-2">
          <p className="text-xs text-muted-foreground/75">
            Alimenté par ElevenLabs Conversational AI
          </p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-1 h-1 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">Interface vocale avancée</span>
          </div>
        </div>
      </div>

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
            background: conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)));
          }
          
          elevenlabs-convai {
            display: block !important;
            width: 100% !important;
            max-width: 500px !important;
            margin: 0 auto !important;
            z-index: 1000 !important;
          }
          
          elevenlabs-convai iframe {
            border-radius: 16px !important;
            border: 2px solid hsl(var(--border)) !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
            background: hsl(var(--background)) !important;
          }
        `
      }} />
    </div>
  );
};