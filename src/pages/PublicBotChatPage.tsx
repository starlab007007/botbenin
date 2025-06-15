
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StandardizedChatInterface } from '@/components/StandardizedChatInterface';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

export const PublicBotChatPage: React.FC = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(true);
  const [hasValidBot, setHasValidBot] = useState(false);
  const [guestReady, setGuestReady] = useState(false);
  const isMobile = useIsMobile();

  const { isGuest, enableGuestMode, isAuthenticated, isLoading } = useAuth();

  // Nouvelle gestion : attendre le contexte invité prêt AVANT la validation d'accès 
  useEffect(() => {
    if (!isAuthenticated && !isGuest) {
      enableGuestMode();
    }
  // On surveille isGuest et isAuthenticated pour avancer ensuite
  }, [isGuest, isAuthenticated, enableGuestMode]);

  // Une fois invité ou connecté = prêt pour valider le bot
  useEffect(() => {
    if (!botId) {
      setIsValidating(false);
      setHasValidBot(false);
      return;
    }
    // Attendre que l'auth se soit stabilisée
    if (isAuthenticated || isGuest) {
      setGuestReady(true);
    }
  }, [botId, isAuthenticated, isGuest]);

  useEffect(() => {
    if (!guestReady || !botId) return;
    validateBotAccess();
    // eslint-disable-next-line
  }, [guestReady, botId]);

  const validateBotAccess = async () => {
    try {
      setIsValidating(true);
      console.log('=== VALIDATION ACCÈS BOT PUBLIC (Contexte prêt) ===');
      console.log('Bot ID:', botId);
      // Laisser la logique à StandardizedChatInterface : juste confirmer qu'on a un botId pour y accéder
      setHasValidBot(true);
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      setHasValidBot(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleBackToLanding = () => {
    if (window.opener) {
      window.close();
    } else {
      navigate('/');
    }
  };

  // Attente explicite de l'initialisation du contexte invité ou authentifié
  if (isLoading || (!isAuthenticated && !isGuest)) {
    return (
      <div className={`h-screen bg-gray-50 flex items-center justify-center ${isMobile ? 'px-[2.5%]' : ''}`}>
        <div className="text-center">
          <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Initialisation de la session...
          </h2>
          <p className="text-gray-600">
            Préparation de l'accès invité
          </p>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className={`h-screen bg-gray-50 flex items-center justify-center ${isMobile ? 'px-[2.5%]' : ''}`}>
        <div className="text-center">
          <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Validation de l'accès...
          </h2>
          <p className="text-gray-600">
            Vérification de l'accessibilité du bot
          </p>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!botId || !hasValidBot) {
    return (
      <div className={`h-screen bg-gray-50 flex items-center justify-center ${isMobile ? 'px-[2.5%]' : 'p-4'}`}>
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Accès non autorisé
          </h2>
          <p className="text-gray-600 mb-6">
            Ce bot n'est pas accessible publiquement ou n'existe pas.
          </p>
          <Button onClick={handleBackToLanding} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <StandardizedChatInterface
        botId={botId}
        onBackToLanding={handleBackToLanding}
        entryPoint="public_chat"
      />
    </div>
  );
};
