
import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { LiveChatSystem } from '@/components/support/LiveChatSystem';
import { StandardizedChatInterface } from '@/components/StandardizedChatInterface';
import { BotConfigService } from '@/services/botConfigService';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

// Utilitaire pour détecter les appareils mobiles
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [useLiveChatSystem, setUseLiveChatSystem] = useState(false);
  const [isSharedLink, setIsSharedLink] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [botId, setBotId] = useState<string | null>(null);
  const [entryPoint, setEntryPoint] = useState('direct');
  const [isTest, setIsTest] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobileHook = useIsMobile();

  useEffect(() => {
    setIsMobile(isMobileDevice());
    initializeChatPage();
  }, [searchParams, location]);

  const initializeChatPage = async () => {
    try {
      console.log('=== INITIALISATION CHAT PAGE STANDARDISÉE ===');
      console.log('URL complète:', window.location.href);
      console.log('Est mobile:', isMobileDevice());
      
      // Normaliser les paramètres URL avec le service standardisé
      const params = BotConfigService.normalizeUrlParams(searchParams);
      
      console.log('Paramètres normalisés:', params);

      setEntryPoint(params.entryPoint);
      setIsTest(params.isTest);
      setRefCode(params.refCode);

      // Détecter le Bot ID final
      const pathBotId = location.pathname.split('/').pop();
      const finalBotId = params.botId || pathBotId;
      
      console.log('Bot ID final:', finalBotId);

      // Détecter si c'est un lien partagé
      const isFromSharedLink = params.entryPoint === 'shortened_link' || 
                              !!params.refCode || 
                              !!params.webhookUrl || 
                              location.pathname.includes('/chat/');
      setIsSharedLink(isFromSharedLink);

      // Optimisation mobile pour liens partagés
      if (isMobileDevice() && isFromSharedLink) {
        console.log('Mode mobile détecté avec lien partagé - optimisation affichage');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
      }

      // Si on a un botId spécifique, utiliser le système standardisé
      if (finalBotId && finalBotId !== 'chat') {
        setBotId(finalBotId);
        setUseLiveChatSystem(false);
      } else {
        // Utiliser le système de chat live par défaut
        console.log('Accès depuis le menu - utilisation du LiveChatSystem');
        setUseLiveChatSystem(true);
      }

    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      setUseLiveChatSystem(true);
    } finally {
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
        try {
          window.close();
        } catch (e) {
          console.log('Impossible de fermer automatiquement la fenêtre');
          window.location.href = 'about:blank';
        }
      }
    } else {
      // Comportement normal
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
      <div className={`${isMobile && isSharedLink ? 'h-screen w-screen' : 'h-screen'} flex items-center justify-center bg-gray-50 ${isMobileHook ? 'px-[2.5%]' : ''}`}>
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
  if (botId && !useLiveChatSystem) {
    return (
      <div className={
        isMobile && isSharedLink 
          ? "h-screen w-screen overflow-hidden fixed inset-0 z-50" 
          : isSharedLink 
            ? "h-screen w-screen overflow-hidden" 
            : "h-[calc(100vh-8rem)]"
      }>
        <StandardizedChatInterface
          botId={botId}
          onBackToLanding={handleBackToLanding}
          entryPoint={entryPoint}
          isTest={isTest}
          refCode={refCode}
        />
      </div>
    );
  }

  // Utiliser le système de chat live par défaut
  return (
    <div className={`h-[calc(100vh-8rem)] ${isMobileHook ? 'px-[2.5%]' : ''}`}>
      <LiveChatSystem />
    </div>
  );
};
