
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
      console.log('=== ACCÈS PUBLIC DIRECT AU BOT ===');
      console.log('Bot ID depuis URL publique:', botId);
      console.log('URL complète:', window.location.href);
      fetchBot();
    }
  }, [botId]);

  const fetchBot = async () => {
    try {
      setIsLoading(true);
      
      console.log('=== CHARGEMENT BOT PUBLIC DIRECT ===');
      console.log('Bot ID demandé:', botId);
      
      const { data: botData, error } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .eq('share_enabled', true)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du bot public:', error);
        if (error.code === 'PGRST116') {
          setError('Ce chatbot n\'existe pas ou n\'est pas disponible publiquement.');
        } else {
          throw error;
        }
        return;
      }

      if (!botData) {
        setError('Ce chatbot n\'est pas disponible publiquement.');
        return;
      }

      console.log('Bot public chargé avec succès:', {
        id: botData.id,
        name: botData.name,
        webhook_url: botData.webhook_url,
        chat_title: botData.chat_title,
        is_active: botData.is_active,
        share_enabled: botData.share_enabled
      });

      // Vérifier que le webhook est configuré
      if (!botData.webhook_url || botData.webhook_url.trim() === '') {
        console.error('Bot sans webhook URL configuré');
        setError('Ce chatbot n\'est pas correctement configuré.');
        return;
      }

      setBot(botData);
      
      // Initialiser le tracking du visiteur pour ce bot public
      try {
        await initializeVisitorTracking(botId, 'public_link_direct');
        console.log('Tracking visiteur initialisé pour accès public direct');
      } catch (trackingError) {
        console.warn('Erreur lors de l\'initialisation du tracking:', trackingError);
        // Continuer même si le tracking échoue
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement du bot public:', error);
      setError('Impossible de charger ce chatbot. Veuillez réessayer plus tard.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLanding = () => {
    console.log('Fermeture du chat public');
    // Pour un accès public, essayer de fermer la fenêtre ou rediriger vers l'accueil
    if (window.opener) {
      window.close();
    } else {
      // Rediriger vers l'accueil de la plateforme
      window.location.href = 'https://bot.bj';
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Connexion au chatbot...
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
            Chatbot non disponible
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'Ce chatbot n\'est pas accessible publiquement.'}
          </p>
          <Button 
            onClick={() => window.location.href = 'https://bot.bj'} 
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Découvrir Bot.Bj
          </Button>
        </Card>
      </div>
    );
  }

  console.log('=== AFFICHAGE CHAT PUBLIC DIRECT ===');
  console.log('Bot:', bot.name);
  console.log('Webhook URL:', bot.webhook_url);
  console.log('Chat Title:', bot.chat_title);

  // Afficher directement l'interface de chat du bot - plein écran optimisé pour public
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      <ChatInterface
        onBackToLanding={handleBackToLanding}
        webhookUrl={bot.webhook_url}
        chatTitle={bot.chat_title}
        chatContext={bot.chat_context}
      />
    </div>
  );
};
