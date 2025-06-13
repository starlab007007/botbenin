
import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { LiveChatSystem } from '@/components/support/LiveChatSystem';
import { ChatInterface } from '@/components/ChatInterface';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BotConfig {
  id: string;
  name: string;
  webhook_url: string;
  chat_title: string;
  chat_context: string;
  is_active: boolean;
}

export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useLiveChatSystem, setUseLiveChatSystem] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    initializeChatPage();
  }, [searchParams, location]);

  const initializeChatPage = async () => {
    try {
      console.log('=== INITIALISATION CHAT PAGE ===');
      console.log('URL complète:', window.location.href);
      console.log('Pathname:', location.pathname);
      
      // Récupérer les paramètres de l'URL
      const botId = searchParams.get('bot');
      const webhookUrl = searchParams.get('webhook');
      const chatContext = searchParams.get('context');
      const chatTitle = searchParams.get('title');
      const botName = searchParams.get('bot_name');
      const isTest = searchParams.get('test') === 'true';

      console.log('Paramètres URL récupérés:', {
        botId,
        webhookUrl: webhookUrl ? decodeURIComponent(webhookUrl) : null,
        chatContext,
        chatTitle,
        botName,
        isTest
      });

      // Détecter si on vient d'un lien public (avec botId dans l'URL)
      const pathBotId = location.pathname.split('/').pop();
      const finalBotId = botId || pathBotId;

      console.log('Bot ID final:', finalBotId);

      // Si on a un botId spécifique, récupérer sa configuration depuis la base
      if (finalBotId && finalBotId !== 'chat') {
        await loadBotConfiguration(finalBotId, webhookUrl, chatContext, chatTitle, botName);
      } else {
        // Utiliser le système de chat live par défaut (accès depuis le menu)
        console.log('Accès depuis le menu - utilisation du LiveChatSystem');
        setUseLiveChatSystem(true);
        setIsLoading(false);
      }

    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      setUseLiveChatSystem(true);
      setIsLoading(false);
    }
  };

  const loadBotConfiguration = async (
    botId: string, 
    webhookUrl?: string | null, 
    chatContext?: string | null, 
    chatTitle?: string | null,
    botName?: string | null
  ) => {
    try {
      console.log('Chargement configuration bot ID:', botId);

      // Récupérer la configuration complète du bot depuis la base
      const { data: botData, error } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du bot:', error);
        throw error;
      }

      if (!botData) {
        throw new Error('Bot non trouvé');
      }

      console.log('Configuration bot chargée:', botData);

      // Vérifier que le bot est actif
      if (!botData.is_active) {
        toast({
          title: "Bot inactif",
          description: `Le bot "${botData.name}" est actuellement désactivé.`,
          variant: "destructive",
        });
        setUseLiveChatSystem(true);
        setIsLoading(false);
        return;
      }

      // Vérifier que le webhook URL existe
      if (!botData.webhook_url || botData.webhook_url.trim() === '') {
        toast({
          title: "Configuration manquante",
          description: `Le bot "${botData.name}" n'a pas de webhook URL configuré.`,
          variant: "destructive",
        });
        setUseLiveChatSystem(true);
        setIsLoading(false);
        return;
      }

      // Utiliser les paramètres de l'URL ou ceux de la base de données
      const finalConfig: BotConfig = {
        id: botData.id,
        name: botName || botData.name,
        webhook_url: webhookUrl ? decodeURIComponent(webhookUrl) : botData.webhook_url,
        chat_title: chatTitle || botData.chat_title,
        chat_context: chatContext || botData.chat_context,
        is_active: botData.is_active
      };

      console.log('Configuration finale du bot:', finalConfig);

      setBotConfig(finalConfig);
      setUseLiveChatSystem(false);
      setIsLoading(false);

      toast({
        title: `Chat initialisé - ${finalConfig.name}`,
        description: "Le chat du bot est prêt à utiliser",
      });

    } catch (error) {
      console.error('Erreur lors du chargement de la configuration du bot:', error);
      // Ne pas afficher d'erreur si on accède depuis le menu, utiliser simplement le chat par défaut
      console.log('Utilisation du LiveChatSystem par défaut');
      setUseLiveChatSystem(true);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du chat...</p>
        </div>
      </div>
    );
  }

  // Utiliser le chat spécifique du bot si configuré
  if (botConfig && !useLiveChatSystem) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <ChatInterface 
          onBackToLanding={() => window.close()}
          webhookUrl={botConfig.webhook_url}
          chatTitle={botConfig.chat_title}
          chatContext={botConfig.chat_context}
        />
      </div>
    );
  }

  // Utiliser le système de chat live par défaut
  return (
    <div className="h-[calc(100vh-8rem)]">
      <LiveChatSystem />
    </div>
  );
};
