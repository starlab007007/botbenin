
import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { LiveChatSystem } from '@/components/support/LiveChatSystem';
import { ChatInterface } from '@/components/ChatInterface';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { initializeVisitorTracking } from '@/utils/visitorTracking';

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
  const [useLiveChatSystem, setUseLiveChatSystem] = useState(true); // Par défaut: utiliser LiveChatSystem
  const [isSharedLink, setIsSharedLink] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Détecter si c'est un appareil mobile
    setIsMobile(isMobileDevice());
    initializeChatPage();
  }, [searchParams, location]);

  const initializeChatPage = async () => {
    try {
      console.log('=== INITIALISATION CHAT PAGE POUR ACCÈS ANONYME ===');
      console.log('URL complète:', window.location.href);
      console.log('Est mobile:', isMobileDevice());
      console.log('Pathname:', location.pathname);
      
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
        chatTitle,
        botName,
        isTest,
        entryPoint,
        refCode
      });

      // Si on a des paramètres spécifiques d'un bot (webhook, bot_name, etc.), essayer de l'utiliser
      if (webhookUrl && (botName || chatTitle)) {
        console.log('Configuration de bot fournie via URL - utilisation directe');
        
        const finalConfig: BotConfig = {
          id: botId || 'anonymous_bot',
          name: botName || chatTitle || 'Assistant IA',
          webhook_url: decodeURIComponent(webhookUrl),
          chat_title: chatTitle || botName || 'Assistant IA',
          chat_context: chatContext || 'general',
          is_active: true
        };

        console.log('Configuration bot direct:', finalConfig);
        setBotConfig(finalConfig);
        setUseLiveChatSystem(false);
        setIsLoading(false);
        return;
      }

      // Détecter si c'est un lien partagé (avec botId dans l'URL)
      const pathBotId = location.pathname.split('/').pop();
      const finalBotId = botId || pathBotId;

      console.log('Bot ID final:', finalBotId);

      // Détecter si c'est un lien partagé
      const isFromSharedLink = entryPoint === 'shortened_link' || !!refCode || !!webhookUrl || location.pathname.includes('/chat/');
      setIsSharedLink(isFromSharedLink);

      // Sur mobile avec lien partagé, forcer le mode plein écran
      if (isMobileDevice() && isFromSharedLink) {
        console.log('Mode mobile détecté avec lien partagé - optimisation affichage');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
      }

      // Si on a un botId spécifique, essayer de récupérer sa configuration
      if (finalBotId && finalBotId !== 'chat') {
        try {
          await loadBotConfiguration(finalBotId, webhookUrl, chatContext, chatTitle, botName, entryPoint);
        } catch (error) {
          console.log('Impossible de charger le bot spécifique, utilisation du chat par défaut');
          // En cas d'erreur, utiliser le LiveChatSystem par défaut (accès anonyme)
          setUseLiveChatSystem(true);
          setIsLoading(false);
        }
      } else {
        // Accès direct à /chat sans paramètres - utiliser LiveChatSystem (accès anonyme)
        console.log('Accès direct au chat - utilisation du LiveChatSystem pour accès anonyme');
        setUseLiveChatSystem(true);
        setIsLoading(false);
      }

    } catch (error) {
      console.error('Erreur lors de l\'initialisation, utilisation du chat par défaut:', error);
      // En cas d'erreur, toujours permettre l'accès au LiveChatSystem
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
      console.log('Tentative de chargement configuration bot ID:', botId);

      // Récupérer la configuration complète du bot depuis la base (sans auth requise)
      const { data: botData, error } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .eq('share_enabled', true)
        .eq('is_active', true)
        .single();

      if (error) {
        console.log('Bot non trouvé ou non public, utilisation du chat par défaut');
        throw error;
      }

      if (!botData) {
        throw new Error('Bot non trouvé');
      }

      console.log('Configuration bot chargée:', botData);

      // Vérifier que le webhook URL existe
      if (!botData.webhook_url || botData.webhook_url.trim() === '') {
        console.log('Bot sans webhook configuré, utilisation du chat par défaut');
        throw new Error('Webhook manquant');
      }

      // Initialiser le tracking du visiteur (optionnel pour l'accès anonyme)
      try {
        await initializeVisitorTracking(botId, entryPoint || 'direct');
        console.log('Tracking visiteur initialisé');
      } catch (trackingError) {
        console.warn('Erreur tracking (ignorée pour accès anonyme):', trackingError);
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

    } catch (error) {
      console.log('Erreur lors du chargement du bot, utilisation du chat par défaut');
      throw error;
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
          <p className="text-gray-600">Préparation de votre assistant IA</p>
        </div>
      </div>
    );
  }

  // Utiliser le chat spécifique du bot si configuré
  if (botConfig && !useLiveChatSystem) {
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
        />
      </div>
    );
  }

  // Utiliser le système de chat live par défaut (ACCÈS ANONYME AUTORISÉ)
  return (
    <div className="h-[calc(100vh-8rem)]">
      <LiveChatSystem />
    </div>
  );
};
