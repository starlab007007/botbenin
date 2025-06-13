
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
  const [useLiveChatSystem, setUseLiveChatSystem] = useState(false);
  const [isSharedLink, setIsSharedLink] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInMainLayout, setIsInMainLayout] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMobile(isMobileDevice());
    
    // Déterminer si on est dans le MainLayout (utilisateur connecté via /chat) 
    // ou accès direct (lien public)
    const hasLayoutParams = searchParams.get('bot') || searchParams.get('webhook') || 
                           searchParams.get('bot_name') || searchParams.get('title');
    setIsInMainLayout(!hasLayoutParams);
    
    initializeChatPage();
  }, [searchParams, location]);

  const initializeChatPage = async () => {
    try {
      console.log('=== INITIALISATION CHAT PAGE ===');
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
      const isPublic = searchParams.get('public') === 'true';

      console.log('Paramètres URL récupérés:', {
        botId,
        webhookUrl: webhookUrl ? decodeURIComponent(webhookUrl) : null,
        chatContext,
        chatTitle,
        botName,
        isTest,
        entryPoint,
        refCode,
        isPublic
      });

      // Si on a des paramètres de bot dans l'URL, utiliser ChatInterface
      if (webhookUrl || botId || botName || chatTitle) {
        console.log('Paramètres de bot détectés dans URL - utilisation ChatInterface');
        
        let finalConfig: BotConfig;
        
        // Si on a un webhook URL direct, l'utiliser immédiatement
        if (webhookUrl) {
          finalConfig = {
            id: botId || 'anonymous_bot',
            name: botName || chatTitle || 'Assistant IA',
            webhook_url: decodeURIComponent(webhookUrl),
            chat_title: chatTitle || botName || 'Assistant IA',
            chat_context: chatContext || 'general',
            is_active: true
          };
          
          console.log('Configuration directe depuis webhook URL:', finalConfig);
          setBotConfig(finalConfig);
          setUseLiveChatSystem(false);
          setIsLoading(false);
          return;
        }
        
        // Si on a un botId, essayer de charger depuis la DB
        if (botId) {
          try {
            await loadBotConfiguration(botId, webhookUrl, chatContext, chatTitle, botName, entryPoint);
            return;
          } catch (error) {
            console.log('Bot non trouvé en DB, création config par défaut');
          }
        }
        
        // Créer une configuration par défaut
        finalConfig = {
          id: botId || 'custom_bot',
          name: botName || chatTitle || 'Assistant IA',
          webhook_url: '', // Sera vide mais l'interface s'affichera
          chat_title: chatTitle || botName || 'Assistant IA',
          chat_context: chatContext || 'general',
          is_active: true
        };
        
        console.log('Configuration par défaut créée:', finalConfig);
        setBotConfig(finalConfig);
        setUseLiveChatSystem(false);
        setIsLoading(false);
        return;
      }

      // Détecter si c'est un lien partagé
      const pathBotId = location.pathname.split('/').pop();
      const finalBotId = pathBotId && pathBotId !== 'chat' ? pathBotId : null;
      const isFromSharedLink = entryPoint === 'shortened_link' || !!refCode || 
                              location.pathname.includes('/chat/') || isPublic;
      setIsSharedLink(isFromSharedLink);

      // Sur mobile avec lien partagé, forcer le mode plein écran
      if (isMobileDevice() && isFromSharedLink) {
        console.log('Mode mobile détecté avec lien partagé - optimisation affichage');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
      }

      // Si on a un botId spécifique depuis le path, essayer de le charger
      if (finalBotId) {
        try {
          await loadBotConfiguration(finalBotId, webhookUrl, chatContext, chatTitle, botName, entryPoint);
          return;
        } catch (error) {
          console.log('Bot spécifique du path non trouvé, création fallback');
          
          const fallbackConfig: BotConfig = {
            id: finalBotId,
            name: `Bot ${finalBotId}`,
            webhook_url: '',
            chat_title: `Assistant ${finalBotId}`,
            chat_context: 'general',
            is_active: true
          };
          
          console.log('Configuration fallback pour path bot:', fallbackConfig);
          setBotConfig(fallbackConfig);
          setUseLiveChatSystem(false);
          setIsLoading(false);
          return;
        }
      }

      // Si aucun paramètre de bot n'est détecté, utiliser LiveChatSystem
      console.log('Aucun paramètre de bot détecté - utilisation du LiveChatSystem');
      setUseLiveChatSystem(true);
      setIsLoading(false);

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
      console.log('Tentative de chargement configuration bot ID:', botId);

      const { data: botData, error } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .eq('share_enabled', true)
        .eq('is_active', true)
        .single();

      if (error || !botData) {
        throw new Error('Bot non trouvé');
      }

      console.log('Configuration bot chargée depuis DB:', botData);

      const finalWebhookUrl = webhookUrl ? decodeURIComponent(webhookUrl) : botData.webhook_url;

      try {
        await initializeVisitorTracking(botId, entryPoint || 'direct');
        console.log('Tracking visiteur initialisé');
      } catch (trackingError) {
        console.warn('Erreur tracking (ignorée):', trackingError);
      }

      const finalConfig: BotConfig = {
        id: botData.id,
        name: botName || botData.name,
        webhook_url: finalWebhookUrl || '',
        chat_title: chatTitle || botData.chat_title,
        chat_context: chatContext || botData.chat_context,
        is_active: botData.is_active
      };

      console.log('Configuration finale du bot:', finalConfig);

      setBotConfig(finalConfig);
      setUseLiveChatSystem(false);
      setIsLoading(false);

    } catch (error) {
      console.log('Erreur lors du chargement du bot depuis DB');
      throw error;
    }
  };

  const handleBackToLanding = () => {
    if (isMobile && isSharedLink) {
      console.log('Tentative de fermeture sur mobile');
      
      // Restaurer le scroll normal
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      
      if (window.opener) {
        window.close();
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        try {
          window.close();
        } catch (e) {
          console.log('Impossible de fermer automatiquement la fenêtre');
          window.location.href = 'about:blank';
        }
      }
    } else {
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

  // Utiliser ChatInterface si on a une config de bot
  if (botConfig && !useLiveChatSystem) {
    return (
      <div className={
        isMobile && isSharedLink 
          ? "h-screen w-screen overflow-hidden fixed inset-0 z-50" 
          : isSharedLink 
            ? "h-screen w-screen overflow-hidden" 
            : isInMainLayout
              ? "h-[calc(100vh-8rem)]" // Dans MainLayout
              : "h-screen" // Accès direct
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

  // Utiliser le système de chat live par défaut
  return (
    <div className={isInMainLayout ? "h-[calc(100vh-8rem)]" : "h-screen"}>
      <LiveChatSystem />
    </div>
  );
};
