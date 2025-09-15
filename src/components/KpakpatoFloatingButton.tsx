import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mic, MicOff, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ensureConvaiScript,
  mountWidget,
  startConversation,
  stopConversation,
  getWidget,
  removeWidget
} from '@/lib/elevenLabs';

// Agent ID par défaut ou depuis les variables d'environnement
const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || 'agent_6201k518xhz2eemtsrbf38fmjq7p';

export const KpakpatoFloatingButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Gestion du toggle conversation
   */
  const handleToggle = useCallback(async () => {
    setError(null);
    
    try {
      if (!isActive) {
        // Démarrer la conversation
        setIsLoading(true);
        toast.info('Initialisation de Kpakpato…', { 
          duration: 2000,
          position: 'bottom-center' 
        });

        // Charger le script et monter le widget
        await ensureConvaiScript();
        const element = await mountWidget(AGENT_ID);

        // Écouter les événements du widget si disponibles
        const handleWidgetEvent = (eventType: string) => {
          switch (eventType) {
            case 'opened':
            case 'started':
              setIsActive(true);
              break;
            case 'closed':
            case 'stopped':
            case 'ended':
              setIsActive(false);
              break;
            case 'error':
              setError('Erreur du widget');
              toast.error('Erreur lors de l\'utilisation du widget');
              break;
          }
        };

        // Tentative d'écoute des événements
        ['opened', 'closed', 'started', 'stopped', 'ended', 'error'].forEach(eventType => {
          element.addEventListener?.(eventType, () => handleWidgetEvent(eventType));
        });

        // Démarrer la conversation
        await startConversation(element);
        setIsActive(true);
        
        toast.success('🎤 Kpakpato est à l\'écoute !', {
          duration: 2000,
          position: 'bottom-center'
        });
      } else {
        // Arrêter la conversation
        const element = getWidget();
        if (element) {
          await stopConversation(element);
        }
        setIsActive(false);
        toast.info('Conversation terminée', {
          duration: 1500,
          position: 'bottom-center'
        });
      }
    } catch (error: any) {
      console.error('Erreur KpakpatoButton:', error);
      setError(error.message || 'Erreur inconnue');
      
      if (error.message?.includes('micro')) {
        toast.error('🎤 Micro non accessible. Autorise le micro dans ton navigateur.', {
          duration: 4000,
          position: 'bottom-center'
        });
      } else {
        toast.error('Impossible de démarrer Kpakpato. Réessaie dans un moment.', {
          duration: 3000,
          position: 'bottom-center'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isActive]);

  /**
   * Fonction pour fermer complètement le widget
   */
  const handleClose = useCallback(async () => {
    const element = getWidget();
    if (element) {
      await stopConversation(element);
    }
    removeWidget();
    setIsActive(false);
    toast.info('Kpakpato fermé', {
      duration: 1500,
      position: 'bottom-center'
    });
  }, []);

  /**
   * Nettoyage au démontage du composant
   */
  useEffect(() => {
    return () => {
      const element = getWidget();
      if (element && isActive) {
        stopConversation(element).catch(console.warn);
      }
    };
  }, [isActive]);

  /**
   * Libellé dynamique du bouton
   */
  const buttonLabel = useMemo(() => {
    if (isLoading) return 'Connexion…';
    return isActive ? 'Arrêter Kpakpato' : 'Parler avec Kpakpato';
  }, [isActive, isLoading]);

  /**
   * Classes CSS du bouton principal
   */
  const buttonClasses = useMemo(() => {
    const baseClasses = `
      fixed bottom-6 right-6 z-[9999] rounded-full shadow-xl 
      transition-all duration-300 transform hover:scale-105 
      focus:outline-none focus:ring-4 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    `.trim();

    if (isActive) {
      return `${baseClasses} bg-destructive hover:bg-destructive/90 text-destructive-foreground focus:ring-destructive/50`;
    }

    return `${baseClasses} bg-primary hover:bg-primary/90 text-primary-foreground focus:ring-primary/50`;
  }, [isActive]);

  return (
    <>
      {/* Bouton principal flottant */}
      <Button
        onClick={handleToggle}
        disabled={isLoading}
        className={buttonClasses}
        size="lg"
        aria-pressed={isActive}
        aria-label={buttonLabel}
      >
        <div className="flex items-center gap-3 px-2 py-1">
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isActive ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
          
          <span className="font-semibold text-sm sm:text-base hidden sm:inline">
            {buttonLabel}
          </span>
          
          {/* Indicateur visuel sur mobile */}
          <div className="sm:hidden">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
          </div>
        </div>
      </Button>

      {/* Bouton de fermeture secondaire (visible seulement quand actif) */}
      {isActive && !isLoading && (
        <Button
          onClick={handleClose}
          variant="secondary"
          size="sm"
          className="fixed bottom-24 right-6 z-[9999] rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 bg-secondary/90 backdrop-blur-sm"
          aria-label="Fermer Kpakpato"
        >
          <X className="w-4 h-4 mr-2" />
          <span className="text-sm">Fermer</span>
        </Button>
      )}

      {/* Accessibility: erreur pour les lecteurs d'écran */}
      {error && (
        <div className="sr-only" aria-live="polite" role="alert">
          Erreur Kpakpato: {error}
        </div>
      )}
    </>
  );
};

export default KpakpatoFloatingButton;