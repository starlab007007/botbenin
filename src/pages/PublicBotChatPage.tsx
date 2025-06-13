
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatInterface } from '@/components/ChatInterface';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { initializeVisitorTracking } from '@/utils/visitorTracking';

interface PublicBot {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  api_key: string;
  chat_title: string;
  chat_context: string;
  share_enabled: boolean;
  is_active: boolean;
}

export const PublicBotChatPage: React.FC = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [bot, setBot] = useState<PublicBot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (botId) {
      fetchBot();
    }
  }, [botId]);

  const fetchBot = async () => {
    try {
      setIsLoading(true);
      
      console.log('=== CHARGEMENT BOT PUBLIC ===');
      console.log('Bot ID demandé:', botId);
      
      const { data: botData, error } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .eq('share_enabled', true)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du bot:', error);
        if (error.code === 'PGRST116') {
          setError('Ce bot n\'existe pas ou n\'est pas disponible publiquement.');
        } else {
          throw error;
        }
        return;
      }

      console.log('Bot public chargé:', botData);
      setBot(botData);
      
      // Initialiser le tracking du visiteur pour ce bot
      try {
        await initializeVisitorTracking(botId, 'public_chat');
        console.log('Tracking visiteur initialisé pour le bot public');
      } catch (trackingError) {
        console.warn('Erreur lors de l\'initialisation du tracking:', trackingError);
        // Continuer même si le tracking échoue
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement du bot public:', error);
      setError('Impossible de charger ce bot. Veuillez réessayer plus tard.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLanding = () => {
    // Fermer la fenêtre si c'est un popup, sinon rediriger
    if (window.opener) {
      window.close();
    } else {
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Chargement du chat...
          </h2>
          <p className="text-gray-600">
            Préparation de votre assistant IA
          </p>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !bot) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Bot non disponible
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'Ce bot n\'est pas accessible publiquement.'}
          </p>
          <Button onClick={handleBackToLanding} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Card>
      </div>
    );
  }

  // Afficher uniquement l'interface de chat du bot - plein écran
  return (
    <div className="h-screen w-screen overflow-hidden">
      <ChatInterface
        onBackToLanding={handleBackToLanding}
        webhookUrl={bot.webhook_url}
        chatTitle={bot.chat_title}
        chatContext={bot.chat_context}
      />
    </div>
  );
};
