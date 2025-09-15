import React, { useCallback, useMemo, useState } from 'react';
import { Mic, MicOff, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import KpakpatoConversation from './KpakpatoConversation';

export const KpakpatoFloatingButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Gestion du toggle conversation
   */
  const handleToggle = useCallback(async () => {
    setError(null);
    
    if (!isActive) {
      setIsLoading(true);
      toast.info('Initialisation de Kpakpato…', { 
        duration: 2000,
        position: 'bottom-center' 
      });
    }
    
    // Le composant KpakpatoConversation gère la logique
    setIsActive(!isActive);
    
    if (isActive) {
      toast.info('Conversation terminée', {
        duration: 1500,
        position: 'bottom-center'
      });
    }
  }, [isActive]);

  /**
   * Callback quand le status change depuis KpakpatoConversation
   */
  const handleStatusChange = useCallback((active: boolean) => {
    setIsActive(active);
    setIsLoading(false);
  }, []);

  /**
   * Callback pour les erreurs depuis KpakpatoConversation
   */
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
    setIsActive(false);
  }, []);

  /**
   * Fonction pour fermer complètement la conversation
   */
  const handleClose = useCallback(async () => {
    setIsActive(false);
    toast.info('Kpakpato fermé', {
      duration: 1500,
      position: 'bottom-center'
    });
  }, []);

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
      {/* Composant de gestion de la conversation */}
      <KpakpatoConversation
        isActive={isActive}
        onStatusChange={handleStatusChange}
        onError={handleError}
      />

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