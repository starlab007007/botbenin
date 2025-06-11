
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

    if (botId) {
      // Si un bot ID est fourni, charger la configuration du bot
      loadBotConfiguration(botId);
    } else if (context || title) {
      // Si des paramètres de contexte sont fournis directement
      setBotConfig({
        chatTitle: title ? decodeURIComponent(title) : 'Assistant IA',
        chatContext: context || 'general'
      });
      setShowChat(true);
    }
  }, [searchParams]);

  const loadBotConfiguration = async (botId: string) => {
    setIsLoading(true);
    try {
      const { data: bot, error } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .eq('is_active', true)
        .single();

      if (error) {
        toast({
          title: "Bot non trouvé",
          description: "Le chatbot demandé n'existe pas ou n'est pas actif",
          variant: "destructive",
        });
        return;
      }

      if (!bot.webhook_url) {
        toast({
          title: "Configuration incomplète",
          description: "Ce chatbot n'a pas de webhook configuré",
          variant: "destructive",
        });
        return;
      }

      setBotConfig({
        webhookUrl: bot.webhook_url,
        chatTitle: bot.chat_title || 'Assistant IA',
        chatContext: bot.chat_context || 'general'
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
