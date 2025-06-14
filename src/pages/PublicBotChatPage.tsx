
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StandardizedChatInterface } from '@/components/StandardizedChatInterface';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, AlertCircle, ArrowLeft } from 'lucide-react';

export const PublicBotChatPage: React.FC = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(true);
  const [hasValidBot, setHasValidBot] = useState(false);

  useEffect(() => {
    if (botId) {
      validateBotAccess();
    } else {
      setIsValidating(false);
    }
  }, [botId]);

  const validateBotAccess = async () => {
    try {
      setIsValidating(true);
      
      console.log('=== VALIDATION ACCÈS BOT PUBLIC ===');
      console.log('Bot ID:', botId);
      
      // La validation est maintenant gérée par le StandardizedChatInterface
      // On passe directement à l'affichage
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

  if (isValidating) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
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
      <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
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
