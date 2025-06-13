import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BookmarkedAdvice } from '@/components/BookmarkedAdvice';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessageArea } from '@/components/ChatMessageArea';
import { ChatInputArea } from '@/components/ChatInputArea';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isBookmarked?: boolean;
}

interface ChatInterfaceProps {
  onBackToLanding: () => void;
  webhookUrl?: string;
  chatTitle?: string;
  chatContext?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  onBackToLanding, 
  webhookUrl: propWebhookUrl,
  chatTitle: propChatTitle = 'Bot.Bj Assistant',
  chatContext: propChatContext
}) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  console.log('=== INITIALISATION CHATINTERFACE (ANALYSE COMPLÈTE) ===');
  
  // Récupérer TOUS les paramètres de l'URL
  const urlBotId = searchParams.get('bot');
  const urlWebhookUrl = searchParams.get('webhook');
  const urlBotName = searchParams.get('bot_name');
  const urlChatTitle = searchParams.get('title');
  const urlChatContext = searchParams.get('context');
  const isTest = searchParams.get('test') === 'true';
  const isPublic = searchParams.get('public') === 'true';
  const isConfigured = searchParams.get('configured') === 'true';
  const shareEnabled = searchParams.get('share_enabled') === 'true';

  // Déterminer le webhook final - PRIORITÉ AUX PARAMÈTRES URL
  const webhookUrl = urlWebhookUrl ? decodeURIComponent(urlWebhookUrl) : propWebhookUrl;
  const chatTitle = urlChatTitle || urlBotName || propChatTitle;
  const chatContext = urlChatContext || propChatContext;
  
  // LOGIQUE AMÉLIORÉE : Un bot est considéré comme fonctionnel si :
  // 1. Il a un webhook URL configuré ET accessible, OU
  // 2. C'est un accès public (même sans webhook - mode démo)
  const hasWorkingWebhook = Boolean(webhookUrl && webhookUrl.trim() !== '' && webhookUrl !== 'undefined');
  const isPublicAccess = isPublic || urlBotId; // Considérer tout accès avec bot ID comme potentiellement public
  const canChatFunction = hasWorkingWebhook; // Seuls les bots avec webhook peuvent vraiment fonctionner
  const canShowDemo = isPublicAccess; // Les accès publics peuvent au moins montrer l'interface

  console.log('=== ANALYSE ÉTAT DU BOT AMÉLIORÉE ===', {
    urlBotId,
    urlBotName,
    urlChatTitle,
    urlChatContext,
    webhookUrl: webhookUrl || 'NON_DÉFINI',
    chatTitle,
    chatContext,
    isTest,
    isPublic,
    isConfigured,
    shareEnabled,
    hasWorkingWebhook,
    isPublicAccess,
    canChatFunction: canChatFunction ? 'OUI' : 'NON',
    canShowDemo: canShowDemo ? 'OUI' : 'NON'
  });
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: getWelcomeMessage(chatContext, chatTitle, canChatFunction, isPublicAccess, hasWorkingWebhook),
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { toast } = useToast();

  function getWelcomeMessage(context?: string, title?: string, canFunction?: boolean, isPublicAccess?: boolean, hasWebhook?: boolean): string {
    const botName = title || 'Bot.Bj';
    
    if (!canFunction) {
      if (isPublicAccess) {
        return `👋 Bonjour ! Je suis **${botName}**.

🌟 **Interface de démonstration** : Vous pouvez explorer cette interface et voir comment elle fonctionne !

${hasWebhook ? 
  '⚙️ **Configuration en cours** : Ce bot est en cours de finalisation par l\'administrateur. Toutes les fonctionnalités seront bientôt disponibles.' :
  '🔧 **Configuration requise** : L\'administrateur doit configurer l\'URL webhook pour activer les réponses automatiques.'
}

💬 N'hésitez pas à taper un message pour tester l'interface !`;
      } else {
        return `👋 Bonjour ! Je suis ${botName}.

⚠️ **Configuration en cours** : Ce bot est en cours de configuration. Veuillez configurer l'URL du webhook dans les paramètres du bot.

💬 Vous pouvez tout de même explorer l'interface et voir comment elle fonctionne !`;
      }
    }
    
    const publicIndicator = isPublicAccess ? '🌐 ' : '';
    
    switch (context) {
      case 'services_locaux':
        return `${publicIndicator}🏢 Bonjour ! Je suis ${botName}, votre assistant IA pour les services locaux. Je peux vous aider à trouver des restaurants, hôtels, commerces et autres services dans votre région. Que recherchez-vous aujourd'hui ?`;
      case 'restaurant':
        return `${publicIndicator}🍽️ Bonjour ! Je suis ${botName}, votre assistant IA pour la réservation de restaurants. Je peux vous aider à trouver le restaurant parfait, vérifier les disponibilités et faire votre réservation. Quel type de restaurant recherchez-vous ?`;
      case 'automation':
        return `${publicIndicator}🤖 Bonjour ! Je suis ${botName}, votre assistant IA automatisé. Je peux vous aider avec une large gamme de tâches selon ma configuration personnalisée. Comment puis-je vous assister aujourd'hui ?`;
      default:
        return `${publicIndicator}🚀 Bonjour ! Je suis ${botName}, votre assistant IA intelligent. Je peux vous aider avec vos questions et vous accompagner dans vos démarches. Comment puis-je vous aider aujourd'hui ?`;
    }
  }

  // Determine user context based on current route or provided context
  const getUserContext = (): 'business' | 'marketing' | 'gestion' | 'citoyen' | 'services_locaux' | 'restaurant' | 'automation' | 'general' => {
    if (chatContext) return chatContext as any;
    const path = location.pathname;
    if (path.includes('business')) return 'business';
    if (path.includes('marketing')) return 'marketing';
    if (path.includes('gestion')) return 'gestion';
    if (path.includes('citoyen')) return 'citoyen';
    return 'general';
  };

  // Fonction de retour adaptée selon le contexte
  const handleBackToLanding = () => {
    if (isPublicAccess) {
      // Pour un accès public, rediriger vers bot.bj
      console.log('Fermeture du chat public - redirection vers bot.bj');
      window.location.href = 'https://bot.bj';
    } else {
      // Pour les utilisateurs connectés, utiliser la fonction fournie
      console.log('Retour via fonction onBackToLanding');
      onBackToLanding();
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    // Message utilisateur ajouté immédiatement
    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setShowSuggestions(false);

    // Si le bot ne peut pas fonctionner (pas de webhook)
    if (!canChatFunction) {
      console.log('Bot sans webhook - réponse de démonstration');
      
      // Réponse adaptée selon le contexte
      let demoResponse = '';
      
      if (isPublicAccess) {
        demoResponse = `Merci pour votre message : "${textToSend}" !

🎯 **Interface de démonstration** : Cette interface vous montre à quoi ressemble une conversation avec ${chatTitle}.

${hasWorkingWebhook ? 
  '⏳ **Activation en cours** : L\'administrateur finalise actuellement la configuration. Toutes les fonctionnalités seront bientôt disponibles !' :
  '🔧 **Configuration nécessaire** : L\'administrateur doit configurer l\'URL webhook pour activer les réponses automatiques.'
}

✨ **Fonctionnalités à venir** :
• Réponses intelligentes personnalisées
• Intégration avec les systèmes métier
• Suivi des conversations
• Et bien plus encore !

💡 **Vous êtes administrateur ?** Configurez l'URL webhook dans les paramètres du bot pour activer toutes les fonctionnalités.`;
      } else {
        demoResponse = `Je vois que vous voulez discuter avec moi ! 

🔧 **Configuration requise** : Ce bot n'a pas encore de webhook configuré pour les réponses automatiques.

💡 **Pour l'administrateur** : Configurez l'URL du webhook dans les paramètres du bot pour activer les réponses IA.

🎯 **Interface fonctionnelle** : Vous pouvez continuer à explorer cette interface pour voir comment elle fonctionne !`;
      }

      const demoMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: demoResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, demoMessage]);
      
      toast({
        title: `${chatTitle} - ${isPublicAccess ? 'Mode démonstration' : 'Configuration requise'}`,
        description: isPublicAccess ? "Interface de démonstration - Configuration en cours" : "Webhook manquant - Interface disponible pour test",
        variant: "default",
      });
      return;
    }

    // Communication avec le webhook si disponible
    setIsLoading(true);

    console.log('=== COMMUNICATION N8N POUR BOT AVEC WEBHOOK ===');
    console.log('Bot ID:', urlBotId);
    console.log('Bot Name:', urlBotName || chatTitle);
    console.log('User message:', textToSend);
    console.log('Webhook URL utilisée:', webhookUrl);

    try {
      // ... keep existing code (webhook communication logic)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout après 30 secondes');
        controller.abort();
      }, 30000);

      const requestPayload = {
        message: textToSend,
        timestamp: new Date().toISOString(),
        session_id: `bot_${urlBotId || 'unknown'}_${chatContext || 'automation'}_${Date.now()}`,
        user_id: `bot_bj_user_${urlBotId || 'unknown'}`,
        source: 'bot_bj_platform',
        context: chatContext || 'automation',
        chat_title: chatTitle,
        bot_id: urlBotId,
        bot_name: urlBotName || chatTitle,
        bot_type: chatContext === 'automation' ? 'dashboard_created' : 'predefined',
        interface_type: 'full_chat_interface',
        module: chatContext === 'automation' ? 'automation' : 'citoyen',
        service_type: chatContext || 'automation',
        platform: 'bot_bj',
        is_test_mode: isTest,
        is_public_access: isPublicAccess,
        webhook_source: 'bot_specific_config'
      };

      console.log('Request payload enrichi:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Bot.Bj-Platform/1.0',
          'X-Bot-Platform': 'bot_bj',
          'X-Bot-Version': '1.0',
          'X-Bot-ID': urlBotId || 'unknown',
          'X-Bot-Name': encodeURIComponent(urlBotName || chatTitle),
          'X-Webhook-Source': 'bot_specific',
          'X-Chat-Context': chatContext || 'automation',
          'X-Is-Test': isTest ? 'true' : 'false',
          'X-Is-Public': isPublicAccess ? 'true' : 'false'
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let responseData;
      let processedContent;

      if (contentType.includes('application/json')) {
        responseData = await response.json();
        processedContent = responseData.output || 
                          responseData.message || 
                          responseData.response || 
                          responseData.text || 
                          responseData.content ||
                          responseData.reply ||
                          (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
      } else {
        responseData = await response.text();
        processedContent = responseData;
      }

      if (!processedContent || processedContent.trim() === '') {
        throw new Error('Réponse vide ou invalide du webhook N8N');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedContent.trim(),
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('=== ERREUR COMMUNICATION N8N ===', error);
      
      let errorMessage = `Je rencontre des difficultés techniques avec le webhook configuré pour "${chatTitle}".`;
      let toastMessage = `Problème de connexion webhook`;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `La requête a pris trop de temps. Le système pourrait être occupé. Veuillez réessayer.`;
          toastMessage = `Timeout webhook`;
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = `Impossible de se connecter au webhook. Vérifiez que l'URL est correcte et accessible.`;
          toastMessage = `Problème de connectivité webhook`;
        }
      }

      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorMessage,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, fallbackMessage]);
      
      toast({
        title: `${chatTitle} - Problème technique`,
        description: toastMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    handleSendMessage(suggestion.action);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleBookmark = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, isBookmarked: !msg.isBookmarked }
          : msg
      )
    );
  };

  const bookmarkedMessages = messages.filter(msg => msg.isBookmarked && !msg.isUser);

  if (showBookmarks) {
    return (
      <BookmarkedAdvice 
        bookmarkedMessages={bookmarkedMessages}
        onBack={() => setShowBookmarks(false)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gradient-warm">
      <ChatHeader
        onBackToLanding={handleBackToLanding}
        isLoading={isLoading}
        bookmarkedCount={bookmarkedMessages.length}
        onShowBookmarks={() => setShowBookmarks(true)}
        title={chatTitle}
      />
      
      {/* Affichage de l'état du bot amélioré */}
      {!hasWorkingWebhook && (
        <Alert className="mx-4 mt-4 border-blue-200 bg-blue-50">
          {canShowDemo ? (
            <Info className="h-4 w-4 text-blue-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
          <AlertDescription className="text-blue-800">
            {canShowDemo ? (
              <>
                <strong>Interface de démonstration :</strong> Ce bot est accessible publiquement. 
                Explorez l'interface et découvrez les fonctionnalités à venir !
                {hasWorkingWebhook ? ' Configuration en cours par l\'administrateur.' : ' Configuration du webhook requise pour les réponses automatiques.'}
              </>
            ) : (
              <>
                <strong>Configuration requise :</strong> Ce bot n'a pas de webhook configuré. 
                L'interface est fonctionnelle mais les réponses automatiques ne sont pas activées.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <ChatMessageArea
        messages={messages}
        showSuggestions={showSuggestions}
        userContext={getUserContext()}
        isLoading={isLoading}
        onToggleBookmark={toggleBookmark}
        onSuggestionClick={handleSuggestionClick}
      />
      
      <ChatInputArea
        inputValue={inputValue}
        isLoading={isLoading}
        onInputChange={setInputValue}
        onKeyPress={handleKeyPress}
        onSendMessage={() => handleSendMessage()}
      />
    </div>
  );
};
