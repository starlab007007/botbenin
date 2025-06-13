
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (botId) {
      console.log('=== ACCÈS PUBLIC DIRECT AU BOT ===');
      console.log('Bot ID depuis URL publique:', botId);
      console.log('URL complète:', window.location.href);
      fetchBotAndRedirect();
    }
  }, [botId]);

  const fetchBotAndRedirect = async () => {
    try {
      setIsLoading(true);
      
      console.log('=== CHARGEMENT BOT PUBLIC POUR REDIRECTION ===');
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

      // Initialiser le tracking du visiteur pour ce bot public
      try {
        await initializeVisitorTracking(botId, 'public_link_direct');
        console.log('Tracking visiteur initialisé pour accès public direct');
      } catch (trackingError) {
        console.warn('Erreur lors de l\'initialisation du tracking:', trackingError);
        // Continuer même si le tracking échoue
      }

      // Construire l'URL de chat avec TOUS les paramètres du bot - CRITIQUE pour éviter l'erreur webhook
      const chatParams = new URLSearchParams({
        bot: botData.id,
        webhook: encodeURIComponent(botData.webhook_url || ''), // Toujours inclure, même si vide
        context: botData.chat_context || 'automation',
        title: botData.chat_title || botData.name,
        bot_name: botData.name,
        public: 'true',
        // Paramètres supplémentaires pour assurer le bon fonctionnement
        configured: botData.webhook_url ? 'true' : 'false', // Indique si le bot est configuré
        share_enabled: 'true' // Confirme que c'est un accès public autorisé
      });

      const chatUrl = `/chat?${chatParams.toString()}`;
      
      console.log('=== REDIRECTION VERS CHAT AVEC PARAMÈTRES COMPLETS ===');
      console.log('URL de redirection:', chatUrl);
      console.log('Paramètres transmis:', {
        botId: botData.id,
        webhookUrl: botData.webhook_url || 'NON_CONFIGURE',
        chatTitle: botData.chat_title,
        chatContext: botData.chat_context,
        botName: botData.name,
        isPublic: true,
        isConfigured: !!botData.webhook_url
      });

      // Rediriger immédiatement vers la page de chat avec les paramètres complets
      navigate(chatUrl, { replace: true });
      
    } catch (error) {
      console.error('Erreur lors du chargement du bot public:', error);
      setError('Impossible de charger ce chatbot. Veuillez réessayer plus tard.');
      setIsLoading(false);
    }
  };

  const handleBackToLanding = () => {
    console.log('Retour vers la landing page');
    window.location.href = 'https://bot.bj';
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
            Redirection vers votre assistant IA
          </p>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Chatbot non disponible
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
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

  return null;
};
