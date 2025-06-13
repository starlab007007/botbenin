
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BookmarkedAdvice } from '@/components/BookmarkedAdvice';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessageArea } from '@/components/ChatMessageArea';
import { ChatInputArea } from '@/components/ChatInputArea';
import { useLocation, useSearchParams } from 'react-router-dom';
import { getVisitorSessionData, isVisitorAuthenticated } from '@/utils/visitorAuth';

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
  isVisitorMode?: boolean;
  botId?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  onBackToLanding, 
  webhookUrl,
  chatTitle = 'Bot.Bj Assistant',
  chatContext,
  isVisitorMode = false,
  botId
}) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  console.log('=== INITIALISATION CHATINTERFACE ===');
  console.log('Props reçues:', {
    webhookUrl,
    chatTitle,
    chatContext,
    isVisitorMode,
    botId,
    onBackToLanding: !!onBackToLanding
  });

  // Récupérer les paramètres supplémentaires de l'URL si disponibles
  const urlBotId = searchParams.get('bot') || botId;
  const urlBotName = searchParams.get('bot_name');
  const isTest = searchParams.get('test') === 'true';

  console.log('Paramètres URL ChatInterface:', {
    urlBotId,
    urlBotName,
    isTest,
    finalWebhookUrl: webhookUrl
  });
  
  // IMPORTANT: Vérifier que le webhook URL est bien fourni
  if (!webhookUrl) {
    console.error('ERREUR CRITIQUE: Aucun webhook URL fourni pour ce bot !');
    console.error('Props reçues:', { webhookUrl, chatTitle, chatContext });
  }
  
  // Utiliser le nom du bot depuis l'URL si disponible
  const finalChatTitle = urlBotName || chatTitle;
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: getWelcomeMessage(chatContext, finalChatTitle, isVisitorMode),
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { toast } = useToast();

  function getWelcomeMessage(context?: string, title?: string, visitorMode?: boolean): string {
    const botName = title || 'Bot.Bj';
    const greetingPrefix = visitorMode ? '👋 Bonjour visiteur ! ' : '🚀 Bonjour ! ';
    
    switch (context) {
      case 'services_locaux':
        return `🏢 ${greetingPrefix}Je suis ${botName}, votre assistant IA pour les services locaux. Je peux vous aider à trouver des restaurants, hôtels, commerces et autres services dans votre région. Que recherchez-vous aujourd'hui ?`;
      case 'restaurant':
        return `🍽️ ${greetingPrefix}Je suis ${botName}, votre assistant IA pour la réservation de restaurants. Je peux vous aider à trouver le restaurant parfait, vérifier les disponibilités et faire votre réservation. Quel type de restaurant recherchez-vous ?`;
      case 'automation':
        return `🤖 ${greetingPrefix}Je suis ${botName}, votre assistant IA automatisé connecté via N8N. Je peux vous aider avec une large gamme de tâches selon ma configuration personnalisée. Comment puis-je vous assister aujourd'hui ?`;
      default:
        return `🚀 ${greetingPrefix}Je suis ${botName}, votre assistant IA intelligent. Je peux vous aider avec vos questions et vous accompagner dans vos démarches. Comment puis-je vous aider aujourd'hui ?`;
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

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    // Vérification critique du webhook URL
    if (!webhookUrl) {
      console.error('ERREUR CRITIQUE: Aucun webhook URL configuré pour ce bot');
      console.error('ChatInterface Props:', { webhookUrl, chatTitle, chatContext });
      console.error('URL Params:', { urlBotId, urlBotName, isTest });
      
      toast({
        title: `${finalChatTitle} - Configuration manquante`,
        description: "Aucun webhook URL configuré pour ce bot. Veuillez configurer le webhook dans les paramètres du bot.",
        variant: "destructive",
      });
      return;
    }

    setShowSuggestions(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    console.log('=== COMMUNICATION N8N AVEC AUTHENTIFICATION VISITEUR ===');
    console.log('Bot ID:', urlBotId);
    console.log('Bot Name:', urlBotName || finalChatTitle);
    console.log('User message:', textToSend);
    console.log('Webhook URL utilisée:', webhookUrl);
    console.log('Is Visitor Mode:', isVisitorMode);
    console.log('Chat Context:', chatContext);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout après 30 secondes');
        controller.abort();
      }, 30000);

      // Get visitor session data if in visitor mode
      let visitorSessionData = null;
      if (isVisitorMode && urlBotId) {
        visitorSessionData = getVisitorSessionData(urlBotId);
        console.log('Visitor Session Data:', visitorSessionData);
      }

      // Payload enrichi avec les informations visiteur
      const requestPayload = {
        message: textToSend,
        timestamp: new Date().toISOString(),
        session_id: isVisitorMode && visitorSessionData 
          ? visitorSessionData.session_token
          : `bot_${urlBotId || 'unknown'}_${chatContext || 'automation'}_${Date.now()}`,
        user_id: isVisitorMode && visitorSessionData 
          ? visitorSessionData.visitor_id 
          : `bot_bj_user_${urlBotId || 'unknown'}`,
        source: 'bot_bj_platform',
        context: chatContext || 'automation',
        chat_title: finalChatTitle,
        bot_id: urlBotId,
        bot_name: urlBotName || finalChatTitle,
        bot_type: chatContext === 'automation' ? 'dashboard_created' : 'predefined',
        interface_type: 'full_chat_interface',
        module: chatContext === 'automation' ? 'automation' : 'citoyen',
        service_type: chatContext || 'automation',
        platform: 'bot_bj',
        is_test_mode: isTest,
        webhook_source: 'bot_specific_config',
        // Visitor authentication data
        is_visitor_mode: isVisitorMode,
        visitor_authenticated: isVisitorMode ? true : false,
        visitor_session: visitorSessionData,
        user_type: isVisitorMode ? 'anonymous_visitor' : 'authenticated_user',
        auth_method: isVisitorMode ? 'automatic_visitor_auth' : 'standard_auth'
      };

      console.log('Request payload avec auth visiteur:', JSON.stringify(requestPayload, null, 2));
      console.log('Envoi vers webhook spécifique du bot:', webhookUrl);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Bot.Bj-Platform/1.0',
          'X-Bot-Platform': 'bot_bj',
          'X-Bot-Version': '1.0',
          'X-Bot-ID': urlBotId || 'unknown',
          'X-Bot-Name': encodeURIComponent(urlBotName || finalChatTitle),
          'X-Webhook-Source': 'bot_specific',
          'X-Chat-Context': chatContext || 'automation',
          'X-Is-Test': isTest ? 'true' : 'false',
          'X-Is-Visitor': isVisitorMode ? 'true' : 'false',
          'X-Visitor-ID': visitorSessionData?.visitor_id || '',
          'X-Session-Token': visitorSessionData?.session_token || '',
          'X-User-Type': isVisitorMode ? 'anonymous_visitor' : 'authenticated_user'
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      console.log('=== RÉPONSE N8N BOT SPÉCIFIQUE (VISITEUR) ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      console.log('Response OK:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      console.log('Content-Type:', contentType);

      let responseData;
      let processedContent;

      if (contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('JSON Response N8N:', JSON.stringify(responseData, null, 2));
        
        processedContent = responseData.output || 
                          responseData.message || 
                          responseData.response || 
                          responseData.text || 
                          responseData.content ||
                          responseData.reply ||
                          (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
      } else {
        responseData = await response.text();
        console.log('Text Response N8N:', responseData);
        processedContent = responseData;
      }

      console.log('Contenu traité N8N:', processedContent);

      if (!processedContent || processedContent.trim() === '') {
        throw new Error('Réponse vide ou invalide du webhook N8N');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedContent.trim(),
        isUser: false,
        timestamp: new Date(),
      };

      console.log('Message IA ajouté (depuis N8N avec auth visiteur):', aiMessage);
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('=== ERREUR COMMUNICATION N8N BOT SPÉCIFIQUE (VISITEUR) ===');
      console.error('Bot ID:', urlBotId);
      console.error('Bot Name:', urlBotName || finalChatTitle);
      console.error('Is Visitor Mode:', isVisitorMode);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      console.error('Webhook URL utilisé:', webhookUrl);
      
      let errorMessage = `Je rencontre des difficultés techniques avec le webhook N8N configuré pour "${urlBotName || finalChatTitle}" (${webhookUrl}). Veuillez vérifier la configuration de votre webhook.`;
      let toastMessage = `Problème de connexion N8N - ${urlBotName || finalChatTitle}`;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `La requête vers N8N pour "${urlBotName || finalChatTitle}" a pris trop de temps. Le système pourrait être occupé. Veuillez réessayer.`;
          toastMessage = `Timeout N8N - ${urlBotName || finalChatTitle}`;
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = `Impossible de se connecter à N8N pour "${urlBotName || finalChatTitle}" via l'URL: ${webhookUrl}. Vérifiez que l'URL est correcte et accessible.`;
          toastMessage = `Problème de connectivité N8N - ${urlBotName || finalChatTitle}`;
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
        title: `${finalChatTitle} - Problème technique N8N`,
        description: toastMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('=== FIN COMMUNICATION N8N BOT SPÉCIFIQUE (VISITEUR) ===');
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
        onBackToLanding={onBackToLanding}
        isLoading={isLoading}
        bookmarkedCount={bookmarkedMessages.length}
        onShowBookmarks={() => setShowBookmarks(true)}
        title={finalChatTitle}
        isVisitorMode={isVisitorMode}
      />
      
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
