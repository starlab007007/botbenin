
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatInterface } from '@/components/ChatInterface';
import { LandingHero } from '@/components/LandingHero';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [showChat, setShowChat] = useState(false);
  const [botConfig, setBotConfig] = useState<{
    webhookUrl?: string;
    chatTitle?: string;
    chatContext?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const botId = searchParams.get('bot');
    const context = searchParams.get('context');
    const title = searchParams.get('title');

    console.log('ChatPage params:', { botId, context, title });

    if (botId) {
      // Si un bot ID est fourni, charger la configuration du bot
      loadBotConfiguration(botId);
    } else if (context || title) {
      // Si des paramètres de contexte sont fournis directement
      setBotConfig({
        chatTitle: title ? decodeURIComponent(title) : 'Assistant IA',
        chatContext: context || 'general',
        // NE PAS utiliser d'URL par défaut - laisser vide pour forcer la configuration
        webhookUrl: undefined
      });
      setShowChat(true);
    }
  }, [searchParams]);

  const loadBotConfiguration = async (botId: string) => {
    setIsLoading(true);
    console.log('Chargement de la configuration du bot:', botId);
    
    try {
      const { data: bot, error } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .eq('is_active', true)
        .single();

      console.log('Bot data:', bot);
      console.log('Bot error:', error);

      if (error) {
        console.error('Erreur lors du chargement du bot:', error);
        toast({
          title: "Bot non trouvé",
          description: "Le chatbot demandé n'existe pas ou n'est pas actif",
          variant: "destructive",
        });
        return;
      }

      if (!bot.webhook_url) {
        console.error('ATTENTION: Bot sans webhook URL configuré !', bot);
        toast({
          title: "Configuration incomplète",
          description: "Ce bot n'a pas d'URL webhook configuré. Veuillez configurer le webhook dans les paramètres du bot.",
          variant: "destructive",
        });
        // Ne pas utiliser d'URL par défaut - laisser l'erreur apparaître
      }

      console.log('Configuration du bot chargée:', {
        webhookUrl: bot.webhook_url,
        chatTitle: bot.chat_title,
        chatContext: bot.chat_context,
        botId: bot.id,
        botName: bot.name
      });

      setBotConfig({
        webhookUrl: bot.webhook_url, // Utiliser exactement l'URL du bot
        chatTitle: bot.chat_title || bot.name || 'Assistant IA',
        chatContext: bot.chat_context || 'automation'
      });
      setShowChat(true);

    } catch (error) {
      console.error('Erreur lors du chargement du bot:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la configuration du chatbot",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = () => {
    setShowChat(true);
  };

  const handleBackToLanding = () => {
    setShowChat(false);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showChat) {
    return (
      <ChatInterface
        onBackToLanding={handleBackToLanding}
        webhookUrl={botConfig.webhookUrl}
        chatTitle={botConfig.chatTitle}
        chatContext={botConfig.chatContext}
      />
    );
  }

  return <LandingHero onStartChat={handleStartChat} />;
};
