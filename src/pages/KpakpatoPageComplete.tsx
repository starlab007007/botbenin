import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Plus, List } from 'lucide-react';
import { PersonalAgentCreator } from '@/components/PersonalAgentCreator';
import { PersonalAgentsList } from '@/components/PersonalAgentsList';
import { AgentWidgetManager } from '@/components/AgentWidgetManager';
import { AuthModal } from '@/components/AuthModal';
import { usePersonalAgents } from '@/hooks/usePersonalAgents';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [sharedAgentId, setSharedAgentId] = useState<string | null>(null);
  const [callTimer, setCallTimer] = useState<number>(60);
  const [isCallActive, setIsCallActive] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const { activeAgent, sharedAgent, agents, hasPersonalAgents, fetchAgents, fetchSharedAgent, selectAgent } = usePersonalAgents();

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

  // Effet pour surveiller l'état du widget ElevenLabs et gérer le timer
  useEffect(() => {
    const checkWidgetState = () => {
      const widget = document.querySelector('elevenlabs-convai');
      if (!widget) return;

      // Vérifier si le widget est en mode conversation active
      const shadowRoot = (widget as any).shadowRoot;
      if (shadowRoot) {
        const callButton = shadowRoot.querySelector('[data-testid="call-button"], button');
        const callStatus = shadowRoot.textContent || '';
        
        // Détecter si l'appel est actif (le widget affiche "End call" ou équivalent)
        const isActive = callStatus.includes('Terminer') || callStatus.includes('End call') || 
                        callStatus.includes('J\'écoute') || callStatus.includes('L\'agent vous parle');
        
        if (isActive && !isCallActive) {
          setIsCallActive(true);
          setCallTimer(60); // Réinitialiser le timer à 60 secondes
        } else if (!isActive && isCallActive) {
          setIsCallActive(false);
          setCallTimer(60);
        }
      }
    };

    const interval = setInterval(checkWidgetState, 500);
    return () => clearInterval(interval);
  }, [isCallActive]);

  // Effet pour le décompte du timer
  useEffect(() => {
    if (!isCallActive) return;

    const timerInterval = setInterval(() => {
      setCallTimer((prev) => {
        if (prev <= 1) {
          // Timer terminé - arrêter l'appel
          const widget = document.querySelector('elevenlabs-convai');
          if (widget) {
            const shadowRoot = (widget as any).shadowRoot;
            if (shadowRoot) {
              const endButton = shadowRoot.querySelector('button');
              if (endButton) {
                endButton.click(); // Simuler un clic sur le bouton de fin d'appel
              }
            }
          }
          setIsCallActive(false);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isCallActive]);

  useEffect(() => {
    // Lancer la traduction après le montage du composant
    const timer = setTimeout(translateWidgetText, 1000);
    
    // Surveiller les changements dans le DOM pour retraduire si nécessaire
    const observer = new MutationObserver(translateWidgetText);
    observer.observe(document.body, { childList: true, subtree: true });

    // Vérifier s'il y a un agent partagé dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('agent');
    if (agentId) {
      setSharedAgentId(agentId);
      // Récupérer l'agent partagé
      fetchSharedAgent(agentId).then(agent => {
        // Si l'utilisateur est connecté et possède cet agent, l'activer
        if (isAuthenticated && agent) {
          const ownedAgent = agents.find(a => a.id === agentId);
          if (ownedAgent) {
            selectAgent(ownedAgent);
          }
        }
      });
    }

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [agents, isAuthenticated, selectAgent, fetchSharedAgent]);

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
      
      <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:py-10 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-6 sm:mb-8 lg:mb-12 animate-fade-in">
          <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 mb-4 sm:mb-6 lg:mb-8">
            {/* Outer glow rings */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-cyan-500/30 animate-ping" />
            <div className="absolute inset-2 sm:inset-3 md:inset-4 rounded-full bg-gradient-to-r from-purple-500/40 to-blue-500/40 animate-pulse" />
            
            {/* Main AI core */}
            <div className="absolute inset-4 sm:inset-6 md:inset-8 rounded-full bg-gradient-conic from-blue-500 via-purple-500 via-cyan-500 to-blue-500 animate-spin-slow flex items-center justify-center shadow-2xl">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-background flex items-center justify-center">
                <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 rounded-full bg-primary animate-pulse" />
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent mb-2 sm:mb-4 leading-tight">
            Kpakpato – Agent IA
          </h1>
          
          {/* Section de gestion des agents */}
          {isAuthenticated && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/20 mb-6 sm:mb-8">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-center text-lg sm:text-xl">
                  Gérer mes agents IA personnels
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    <Button
                      onClick={() => setShowAgentCreator(true)}
                      className="bg-primary hover:bg-primary/90 w-full"
                      size="default"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="text-sm sm:text-base">Créer un agent</span>
                    </Button>
                    
                    <Button
                      onClick={() => setShowAgentsList(true)}
                      variant="outline"
                      className="bg-transparent hover:bg-white/10 border-primary/30 w-full"
                      size="default"
                    >
                      <List className="w-4 h-4 mr-2" />
                      <span className="text-sm sm:text-base">Mes agents ({agents.length})</span>
                    </Button>
                    
                    <Button
                      onClick={() => setShowWidgetManager(true)}
                      variant="outline"
                      className="bg-transparent hover:bg-white/10 border-primary/30 w-full sm:col-span-2 lg:col-span-1"
                      size="default"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      <span className="text-sm sm:text-base">Widgets & Partage</span>
                    </Button>
                  </div>
                  
                  {activeAgent && (
                    <div className="text-center p-2 sm:p-3 bg-primary/10 rounded-lg">
                      <p className="text-xs sm:text-sm">
                        <span className="font-medium">Agent actif:</span> {activeAgent.name}
                      </p>
                    </div>
                  )}
                  
                  {sharedAgent && !isAuthenticated && (
                    <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">
                        <span className="font-medium">Agent partagé:</span> {sharedAgent.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Connectez-vous pour créer vos propres agents.
                      </p>
                    </div>
                  )}

                  {sharedAgentId && isAuthenticated && !activeAgent && (
                    <div className="text-center p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                        Vous utilisez un agent partagé mais vous n'en êtes pas propriétaire.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-3 sm:mb-4">
            Cliquez sur le bouton pour{" "}
            <strong>appeler l'agent IA</strong> et discuter en français.
          </p>
          <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500 animate-pulse" />
            <span className="text-muted-foreground">En ligne et prêt à vous écouter</span>
          </div>
        </header>

        {/* Instructions principales */}
        <div className="rounded-xl sm:rounded-2xl shadow-sm border bg-card/70 backdrop-blur-sm p-4 sm:p-6 lg:p-8 text-center">
          <div className="space-y-4 sm:space-y-6">
            <div className="text-base sm:text-lg text-muted-foreground">
              <p className="mb-3 sm:mb-4">
                Utilisez le <strong className="text-primary">bouton flottant</strong> en bas à droite 
                pour démarrer une conversation vocale avec Kpakpato.
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm bg-muted/50 rounded-lg p-2 sm:p-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Cliquez, autorisez le micro, et commencez à parler !</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8 text-xs sm:text-sm text-muted-foreground">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-sm sm:text-base">1</span>
                </div>
                <p className="text-center">Cliquez sur le bouton flottant</p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-sm sm:text-base">2</span>
                </div>
                <p className="text-center">Autorisez l'accès au micro</p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold text-sm sm:text-base">3</span>
                </div>
                <p className="text-center">Commencez la conversation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timer de conversation */}
        {isCallActive && (
          <div className="fixed top-4 right-4 z-50 animate-fade-in">
            <Card className="bg-card/95 backdrop-blur-sm border-primary/30 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center animate-pulse">
                      <span className="text-white font-bold text-lg">{callTimer}</span>
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-ping" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">Temps restant</p>
                    <p className="text-xs text-muted-foreground">
                      {callTimer} seconde{callTimer !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8 lg:mt-12 space-y-1 sm:space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">Interface vocale avancée</span>
          </div>
        </div>

        {/* Bouton pour utilisateurs non authentifiés */}
        {!isAuthenticated && (
          <div className="text-center mt-6 sm:mt-8">
            <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">
                      Créez votre propre agent IA
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4">
                      Personnalisez votre agent conversationnel avec vos propres paramètres et intégrez-le sur votre site web.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                    size="lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un nouvel agent conversation
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Connectez-vous ou créez un compte pour commencer
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Widget ElevenLabs - Utilise l'agent actif, partagé ou par défaut */}
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
      ) : sharedAgent ? (
        <elevenlabs-convai
          agent-id={sharedAgent.elevenlabs_agent_id}
          variant={sharedAgent.widget_config?.variant || 'expanded'}
          action-text={sharedAgent.widget_config?.actionText || 'Nouvel appel'}
          start-call-text={sharedAgent.widget_config?.startCallText || 'Démarrer la conversation'}
          end-call-text={sharedAgent.widget_config?.endCallText || 'Terminer la conversation'}
          listening-text={sharedAgent.widget_config?.listeningText || 'J\'écoute…'}
          speaking-text={sharedAgent.widget_config?.speakingText || 'L\'agent vous parle'}
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
      
      <AgentWidgetManager
        open={showWidgetManager}
        onClose={() => setShowWidgetManager(false)}
      />

      {/* Modal d'authentification pour utilisateurs non connectés */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Affichage des erreurs */}
      {conversationError && (
        <div className="fixed bottom-4 left-2 right-2 sm:left-4 sm:right-auto sm:max-w-sm p-3 sm:p-4 bg-destructive text-destructive-foreground rounded-lg shadow-lg z-40">
          <p className="text-xs sm:text-sm">{conversationError}</p>
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
          
          /* Styling personnalisé du widget responsive */
          elevenlabs-convai {
            border-radius: 8px !important;
            overflow: hidden !important;
          }
          
          elevenlabs-convai iframe {
            border-radius: 8px !important;
          }
          
          @media (min-width: 640px) {
            elevenlabs-convai {
              border-radius: 12px !important;
            }
            
            elevenlabs-convai iframe {
              border-radius: 12px !important;
            }
          }
          
          /* Responsive design pour le widget */
          @media (max-width: 640px) {
            elevenlabs-convai {
              --elv-widget-width: 100vw !important;
              --elv-widget-height: 100vh !important;
            }
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