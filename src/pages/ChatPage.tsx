import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { LiveChatSystem } from '@/components/support/LiveChatSystem';
import { ChatInterface } from '@/components/ChatInterface';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { initializeVisitorTracking } from '@/utils/visitorTracking';
import { createVisitorAuth, isVisitorAuthenticated } from '@/utils/visitorAuth';

interface BotConfig {
  id: string;
  name: string;
  webhook_url: string;
  chat_title: string;
  chat_context: string;
  is_active: boolean;
}

// Utilitaire pour détecter les appareils mobiles
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useLiveChatSystem, setUseLiveChatSystem] = useState(false);
  const [isSharedLink, setIsSharedLink] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisitorMode, setIsVisitorMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Détecter si c'est un appareil mobile
    setIsMobile(isMobileDevice());
    initializeChatPage();
  }, [searchParams, location]);

  const initializeChatPage = async () => {
    try {
      console.log('=== INITIALISATION CHAT PAGE AVEC AUTH VISITEUR ===');
      console.log('URL complète:', window.location.href);
      console.log('Est mobile:', isMobileDevice());
      console.log('Pathname:', location.pathname);
      console.log('Search params:', Object.fromEntries(searchParams.entries()));
      
      // Récupérer les paramètres de l'URL
      const botId = searchParams.get('bot');
      const webhookUrl = searchParams.get('webhook');
      const chatContext = searchParams.get('context');
      const chatTitle = searchParams.get('title');
      const botName = searchParams.get('bot_name');
      const isTest = searchParams.get('test') === 'true';
      const entryPoint = searchParams.get('entry') || 'direct';
      const refCode = searchParams.get('ref');

      console.log('Paramètres URL récupérés:', {
        botId,
        webhookUrl: webhookUrl ? decodeURIComponent(webhookUrl) : null,
        chatContext,
        chatTitle: chatTitle ? decodeURIComponent(chatTitle) : null,
        botName,
        isTest,
        entryPoint,
        refCode
      });

      // Si on a un botId spécifique, c'est un lien partagé
      if (botId && botId !== 'chat') {
        console.log('Bot ID détecté dans l\'URL:', botId);
        
        // Détecter si c'est un lien partagé (vient d'un lien raccourci ou d'un partage)
        const isFromSharedLink = entryPoint === 'shortened_link' || !!refCode || !!webhookUrl || !!chatContext;
        setIsSharedLink(isFromSharedLink);

        // Sur mobile avec lien partagé, forcer le mode plein écran
        if (isMobileDevice() && isFromSharedLink) {
          console.log('Mode mobile détecté avec lien partagé - optimisation affichage');
          document.body.style.overflow = 'hidden';
          document.documentElement.style.overflow = 'hidden';
        }

        // Enable visitor mode for shared links
        if (isFromSharedLink) {
          console.log('Activation du mode visiteur pour lien partagé');
          const visitorAuth = createVisitorAuth(botId);
          setIsVisitorMode(true);
          console.log('Visitor Auth créé:', visitorAuth);
        }
        
        await loadBotConfiguration(botId, webhookUrl, chatContext, chatTitle, botName, entryPoint);
      } else {
        // Utiliser le système de chat live par défaut (accès depuis le menu)
        console.log('Aucun Bot ID - utilisation du LiveChatSystem');
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
    botName?: string | null,
    entryPoint?: string
  ) => {
    try {
      console.log('=== CHARGEMENT CONFIGURATION BOT ===');
      console.log('Bot ID:', botId);

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

      // Initialiser le tracking du visiteur
      try {
        await initializeVisitorTracking(botId, entryPoint || 'direct');
        console.log('Tracking visiteur initialisé');
      } catch (trackingError) {
        console.warn('Erreur lors de l\'initialisation du tracking:', trackingError);
        // Continuer même si le tracking échoue
      }

      // Utiliser les paramètres de l'URL ou ceux de la base de données
      const finalConfig: BotConfig = {
        id: botData.id,
        name: botName || botData.name,
        webhook_url: webhookUrl ? decodeURIComponent(webhookUrl) : botData.webhook_url,
        chat_title: chatTitle ? decodeURIComponent(chatTitle) : botData.chat_title,
        chat_context: chatContext || botData.chat_context,
        is_active: botData.is_active
      };

      console.log('=== CONFIGURATION FINALE DU BOT ===');
      console.log('Configuration finale:', finalConfig);
      console.log('Webhook URL qui sera utilisé:', finalConfig.webhook_url);

      setBotConfig(finalConfig);
      setUseLiveChatSystem(false);
      setIsLoading(false);

      if (!isSharedLink) {
        toast({
          title: `Chat initialisé - ${finalConfig.name}`,
          description: isVisitorMode ? "Chat visiteur prêt" : "Le chat du bot est prêt à utiliser",
        });
      }

    } catch (error) {
      console.error('Erreur lors du chargement de la configuration du bot:', error);
      // En cas d'erreur, utiliser le chat par défaut
      console.log('Utilisation du LiveChatSystem par défaut suite à l\'erreur');
      setUseLiveChatSystem(true);
      setIsLoading(false);
    }
  };

  const handleBackToLanding = () => {
    // Sur mobile avec lien partagé, essayer de fermer la fenêtre/tab
    if (isMobile && isSharedLink) {
      console.log('Tentative de fermeture sur mobile');
      
      // Restaurer le scroll normal
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      
      // Essayer différentes méthodes de fermeture
      if (window.opener) {
        window.close();
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        // Si aucune méthode ne fonctionne, essayer de fermer quand même
        try {
          window.close();
        } catch (e) {
          console.log('Impossible de fermer automatiquement la fenêtre');
          // En dernier recours, rediriger vers une page de confirmation
          window.location.href = 'about:blank';
        }
      }
    } else {
      // Comportement normal pour desktop
      if (window.opener) {
        window.close();
      } else {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className={`${isMobile && isSharedLink ? 'h-screen w-screen' : 'h-screen'} flex items-center justify-center bg-gray-50`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Chargement du chat...
          </h2>
          <p className="text-gray-600">
            {isVisitorMode ? 'Préparation de votre session visiteur' : 'Préparation de votre assistant IA'}
          </p>
        </div>
      </div>
    );
  }

  // Utiliser le chat spécifique du bot si configuré
  if (botConfig && !useLiveChatSystem) {
    console.log('=== RENDU CHAT INTERFACE BOT SPÉCIFIQUE ===');
    console.log('Bot Config:', botConfig);
    console.log('Webhook URL:', botConfig.webhook_url);
    console.log('Is Visitor Mode:', isVisitorMode);
    
    return (
      <div className={
        isMobile && isSharedLink 
          ? "h-screen w-screen overflow-hidden fixed inset-0 z-50" 
          : isSharedLink 
            ? "h-screen w-screen overflow-hidden" 
            : "h-[calc(100vh-8rem)]"
      }>
        <ChatInterface 
          onBackToLanding={handleBackToLanding}
          webhookUrl={botConfig.webhook_url}
          chatTitle={botConfig.chat_title}
          chatContext={botConfig.chat_context}
          isVisitorMode={isVisitorMode}
          botId={botConfig.id}
        />
      </div>
    );
  }

  // Utiliser le système de chat live par défaut
  console.log('=== RENDU LIVE CHAT SYSTEM PAR DÉFAUT ===');
  return (
    <div className="h-[calc(100vh-8rem)]">
      <LiveChatSystem />
    </div>
  );
};
