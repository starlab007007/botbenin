import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Plus, List } from 'lucide-react';
import { PersonalAgentCreator } from '@/components/PersonalAgentCreator';
import { PersonalAgentsList } from '@/components/PersonalAgentsList';
import { usePersonalAgents } from '@/hooks/usePersonalAgents';
import { useAuth } from '@/contexts/AuthContext';

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
  const [showAgentCreator, setShowAgentCreator] = useState(false);
  const [showAgentsList, setShowAgentsList] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const { activeAgent, hasPersonalAgents, fetchAgents } = usePersonalAgents();

  // Fonction pour traduire les textes du widget ElevenLabs
  const translateWidgetText = () => {
    const translateText = () => {
      // Attendre que le widget soit chargé
      const widget = document.querySelector('elevenlabs-convai');
      if (!widget) return;

      // Essayer d'accéder au shadow root
      try {
        const iframe = widget.querySelector('iframe');
        if (iframe && iframe.contentDocument) {
          const doc = iframe.contentDocument;
          
          // Traduire les éléments dans l'iframe
          const elementsToTranslate = doc.querySelectorAll('*');
          elementsToTranslate.forEach(el => {
            if (el.textContent) {
              if (el.textContent.trim() === 'New call') {
                el.textContent = 'Nouvel appel';
              }
              if (el.textContent.trim() === 'Terms and conditions') {
                el.textContent = 'Conditions d\'utilisation';
              }
              if (el.textContent.trim() === 'Cancel') {
                el.textContent = 'Annuler';
              }
              if (el.textContent.trim() === 'Accept') {
                el.textContent = 'Accepter';
              }
              if (el.textContent.includes('By clicking "Agree,"')) {
                el.textContent = 'En cliquant sur "Accepter" et à chaque fois que j\'interagis avec cet agent IA, je consens à l\'enregistrement, au stockage et au partage de mes communications avec des fournisseurs de services tiers, comme décrit dans la Politique de confidentialité. Si vous ne souhaitez pas que vos conversations soient enregistrées, veuillez vous abstenir d\'utiliser ce service.';
              }
            }
          });
        }
      } catch (error) {
        console.log('Impossible d\'accéder au contenu du widget:', error);
      }

      // Essayer aussi avec les éléments directs
      const directElements = document.querySelectorAll('elevenlabs-convai *');
      directElements.forEach(el => {
        if (el.textContent) {
          if (el.textContent.trim() === 'New call') {
            el.textContent = 'Nouvel appel';
          }
          if (el.textContent.trim() === 'Terms and conditions') {
            el.textContent = 'Conditions d\'utilisation';
          }
          if (el.textContent.trim() === 'Cancel') {
            el.textContent = 'Annuler';
          }
          if (el.textContent.trim() === 'Accept') {
            el.textContent = 'Accepter';
          }
        }
      });
    };

    translateText();
    
    // Réessayer plusieurs fois car le widget peut se charger de manière asynchrone
    setTimeout(translateText, 1000);
    setTimeout(translateText, 2000);
    setTimeout(translateText, 3000);
  };

  useEffect(() => {
    // Lancer la traduction après le montage du composant
    const timer = setTimeout(translateWidgetText, 1000);
    
    // Surveiller les changements dans le DOM pour retraduire si nécessaire
    const observer = new MutationObserver(translateWidgetText);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

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
          
          {/* Boutons de gestion des agents personnels */}
          {isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-center animate-fade-in">
              <Button
                onClick={() => setShowAgentCreator(true)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Créer mon agent IA conversation
              </Button>
              
              {hasPersonalAgents && (
                <Button
                  onClick={() => setShowAgentsList(true)}
                  variant="outline"
                  className="bg-transparent hover:bg-white/10 text-white border-white/30 backdrop-blur-sm"
                  size="lg"
                >
                  <List className="w-5 h-5 mr-2" />
                  Mes agents ({activeAgent ? '1 actif' : '0 actif'})
                </Button>
              )}
            </div>
          )}
          
          {activeAgent && (
            <div className="mb-6 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
              <p className="text-white/90 text-sm">
                <span className="font-medium">Agent actif:</span> {activeAgent.name}
              </p>
            </div>
          )}
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

      {/* Widget ElevenLabs - Dynamique selon l'agent personnel ou par défaut */}
      {activeAgent ? (
        <elevenlabs-convai
          agent-id={activeAgent.elevenlabs_agent_id}
          variant={activeAgent.widget_config?.variant || 'expanded'}
          action-text={activeAgent.widget_config?.actionText || 'Nouvel appel'}
          start-call-text={activeAgent.widget_config?.startCallText || 'Démarrer la conversation'}
          end-call-text={activeAgent.widget_config?.endCallText || 'Terminer la conversation'}
          listening-text={activeAgent.widget_config?.listeningText || 'J\'écoute…'}
          speaking-text={activeAgent.widget_config?.speakingText || 'L\'agent vous parle'}
        />
      ) : (
        <elevenlabs-convai
          agent-id="agent_6201k518xhz2eemtsrbf38fmjq7p"
          variant="expanded"
          action-text="Nouvel appel"
          start-call-text="Démarrer la conversation"
          end-call-text="Terminer la conversation"
          listening-text="J'écoute…"
          speaking-text="L'agent vous parle"
        />
      )}

      <script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        async
        type="text/javascript"
      />

      {/* Modals de gestion des agents */}
      <PersonalAgentCreator
        open={showAgentCreator}
        onClose={() => setShowAgentCreator(false)}
        onAgentCreated={() => {
          fetchAgents();
          setShowAgentCreator(false);
        }}
      />
      
      <PersonalAgentsList
        open={showAgentsList}
        onClose={() => setShowAgentsList(false)}
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