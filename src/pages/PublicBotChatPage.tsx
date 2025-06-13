
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, AlertCircle, ArrowLeft } from 'lucide-react';

export const PublicBotChatPage: React.FC = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (botId) {
      console.log('=== ACCÈS PUBLIC DIRECT AU BOT (SANS DB) ===');
      console.log('Bot ID depuis URL publique:', botId);
      console.log('URL complète:', window.location.href);
      redirectToChat();
    }
  }, [botId]);

  const redirectToChat = () => {
    try {
      setIsLoading(true);
      
      console.log('=== REDIRECTION DIRECTE VERS CHAT PUBLIC ===');
      console.log('Bot ID:', botId);
      
      // Construire l'URL de chat avec paramètres minimum pour accès public
      const chatParams = new URLSearchParams({
        bot: botId || '',
        title: `Assistant Public ${botId}`,
        context: 'public',
        public: 'true',
        share_enabled: 'true',
        configured: 'true', // Toujours considéré comme configuré pour public
        webhook: '', // Sera géré côté ChatInterface
        entry: 'public_link_direct'
      });

      const chatUrl = `/chat?${chatParams.toString()}`;
      
      console.log('=== REDIRECTION IMMÉDIATE VERS CHAT ===');
      console.log('URL de redirection:', chatUrl);
      console.log('Aucune vérification DB - accès public total');

      // Redirection immédiate sans vérification
      navigate(chatUrl, { replace: true });
      
    } catch (error) {
      console.error('Erreur lors de la redirection publique:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Connexion au chatbot public...
          </h2>
          <p className="text-gray-600">
            Accès libre sans authentification
          </p>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback en cas d'erreur - ne devrait jamais s'afficher
  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Erreur de redirection
        </h2>
        <p className="text-gray-600 mb-6">
          Une erreur inattendue s'est produite lors de l'accès au chatbot public.
        </p>
        <Button 
          onClick={() => window.location.href = 'https://bot.bj'} 
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à Bot.Bj
        </Button>
      </Card>
    </div>
  );
};
