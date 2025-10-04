import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BookmarkedAdvice } from '@/components/BookmarkedAdvice';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessageArea } from '@/components/ChatMessageArea';
import { ChatInputArea } from '@/components/ChatInputArea';
import { useLocation, useSearchParams } from 'react-router-dom';
import { saveChatMessage } from '@/services/chatService';
import { useBotMessageHistory } from '@/components/bot-conversation/hooks/useBotMessageHistory';
import { useSessionManager } from '@/hooks/useSessionManager';
import { Copy } from 'lucide-react';

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
  botId?: string;
  botName?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onBackToLanding, 
  webhookUrl,
  chatTitle = 'Bot.Bj Assistant',
  chatContext,
  botId: propBotId,
  botName: propBotName
}) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  console.log('=== INITIALISATION CHATINTERFACE ===');
  console.log('Props reçues:', {
    webhookUrl,
    chatTitle,
    chatContext,
    propBotId,
    propBotName,
    onBackToLanding: !!onBackToLanding
  });

  // Récupérer les paramètres supplémentaires de l'URL si disponibles, ou utiliser les props
  const urlBotId = propBotId || searchParams.get('bot');
  const urlBotName = propBotName || searchParams.get('bot_name');
  const isTest = searchParams.get('test') === 'true';

  // Utiliser le hook de gestion de session
  const { sessionToken, isInitializing, isReady, error: sessionError, retryInitialization } = useSessionManager({
    botId: urlBotId,
    entryPoint: 'chat_interface'
  });

  const {
    messages: historyMessages,
    loading: loadingHistory,
    error: errorHistory
  } = useBotMessageHistory(urlBotId, sessionToken);

  console.log('Paramètres URL ChatInterface:', {
    urlBotId,
    urlBotName,
    isTest,
    finalWebhookUrl: webhookUrl,
    sessionToken,
    isReady
  });

  // IMPORTANT: Vérifier que le webhook URL est bien fourni
  if (!webhookUrl) {
    console.error('ERREUR CRITIQUE: Aucun webhook URL fourni pour ce bot !');
    console.error('Props reçues:', { webhookUrl, chatTitle, chatContext });
  }
  
  // Utiliser le nom du bot depuis l'URL si disponible
  const finalChatTitle = urlBotName || chatTitle;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { toast } = useToast();

  function getWelcomeMessage(context?: string, title?: string): string {
    const botName = title || 'Bot.Bj';
    
    switch (context) {
      case 'services_locaux':
        return `🏢 Bonjour ! Je suis ${botName}, votre assistant IA pour les services locaux. Je peux vous aider à trouver des restaurants, hôtels, commerces et autres services dans votre région. Que recherchez-vous aujourd'hui ?`;
      case 'restaurant':
        return `🍽️ Bonjour ! Je suis ${botName}, votre assistant IA pour la réservation de restaurants. Je peux vous aider à trouver le restaurant parfait, vérifier les disponibilités et faire votre réservation. Quel type de restaurant recherchez-vous ?`;
      case 'automation':
        return `🤖 Bonjour ! Je suis ${botName}, votre assistant IA automatisé connecté via N8N. Je peux vous aider avec une large gamme de tâches selon ma configuration personnalisée. Comment puis-je vous assister aujourd'hui ?`;
      default:
        return `🚀 Bonjour ! Je suis ${botName}, votre assistant IA intelligent. Je peux vous aider avec vos questions et vous accompagner dans vos démarches. Comment puis-je vous aider aujourd'hui ?`;
    }
  }

  useEffect(() => {
    const mappedHistory = historyMessages.map((item): Message => ({
      id: item.message_id,
      content: item.message_content,
      isUser: item.message_type === 'user',
      timestamp: new Date(item.message_timestamp),
    }));

    if (mappedHistory.length > 0) {
      setMessages(mappedHistory);
    } else if (!loadingHistory && isReady) {
      setMessages([
        {
          id: '1',
          content: getWelcomeMessage(chatContext, finalChatTitle),
          isUser: false,
          timestamp: new Date(),
        }
      ]);
    }
  }, [historyMessages, loadingHistory, chatContext, finalChatTitle, isReady]);

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

    // Vérification simplifiée de la session
    if (!isReady || !sessionToken) {
      // Si la session est en cours d'initialisation, attendre un peu et réessayer
      if (isInitializing) {
        setTimeout(() => {
          if (isReady && sessionToken) {
            handleSendMessage(textToSend);
          }
        }, 1000);
        return;
      }
      
      toast({
        title: "Erreur de session",
        description: "Impossible d'initialiser la session. Veuillez recharger la page.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    console.log(`[ChatInterface] Sending message with session token: ${sessionToken}`);

    setShowSuggestions(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      isUser: true,
      timestamp: new Date(),
    };

    // Sauvegarder le message utilisateur avec le token de session unifié
    if (sessionToken && urlBotId) {
      console.log(`[ChatInterface] Saving user message: bot=${urlBotId}, token=${sessionToken}`);
      saveChatMessage(urlBotId, sessionToken, textToSend, 'user');
    }

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    console.log('=== COMMUNICATION N8N POUR BOT SPÉCIFIQUE ===');
    console.log('Bot ID:', urlBotId);
    console.log('Bot Name:', urlBotName || finalChatTitle);
    console.log('User message:', textToSend);
    console.log('Webhook URL utilisée:', webhookUrl);
    console.log('Session Token (vérifié):', sessionToken);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout après 60 secondes');
        controller.abort();
      }, 60000);

      // Payload enrichi avec les informations spécifiques du bot
      const requestPayload = {
        message: textToSend,
        timestamp: new Date().toISOString(),
        session_id: sessionToken, // Token unifié et vérifié
        user_id: `bot_bj_user_${urlBotId || 'unknown'}`,
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
        webhook_source: 'bot_specific_config'
      };

      console.log('Request payload enrichi:', JSON.stringify(requestPayload, null, 2));
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
          'X-Is-Test': isTest ? 'true' : 'false'
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      console.log('=== RÉPONSE N8N BOT SPÉCIFIQUE ===');
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

      // Sauvegarder la réponse du bot avec le token de session unifié
      if (sessionToken && urlBotId) {
        console.log(`[ChatInterface] Saving bot response: bot=${urlBotId}, token=${sessionToken}`);
        saveChatMessage(urlBotId, sessionToken, processedContent.trim(), 'bot');
      }

      console.log('Message IA ajouté (depuis N8N):', aiMessage);
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('=== ERREUR COMMUNICATION N8N BOT SPÉCIFIQUE ===');
      console.error('Bot ID:', urlBotId);
      console.error('Bot Name:', urlBotName || finalChatTitle);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      console.error('Webhook URL utilisé:', webhookUrl);
      
      let errorMessage = `Je rencontre des difficultés techniques avec le webhook N8N configuré pour "${urlBotName || finalChatTitle}". Veuillez vérifier la configuration de votre webhook.`;
      let toastMessage = `Problème de connexion N8N - ${urlBotName || finalChatTitle}`;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `La requête vers N8N pour "${urlBotName || finalChatTitle}" a pris plus de 60 secondes. Le système pourrait être surchargé. Veuillez réessayer dans quelques minutes.`;
          toastMessage = `Timeout prolongé N8N - ${urlBotName || finalChatTitle}`;
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
      console.log('=== FIN COMMUNICATION N8N BOT SPÉCIFIQUE ===');
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

  // Affichage d'erreur de session
  if (sessionError) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Erreur d'initialisation
          </h2>
          <p className="text-gray-600 mb-4">
            {sessionError}
          </p>
          <button
            onClick={retryInitialization}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // --- AJOUT affichage sessionToken public ---
  // Affichage sous le header dans le chat public (pour débogage, copiable)
  const [copiedToken, setCopiedToken] = useState(false);
  const handleCopySessionToken = () => {
    if(sessionToken) {
      navigator.clipboard.writeText(sessionToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 1000);
    }
  };

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
      />

      {/* Affichage session token (public/debug) */}
      {sessionToken && (
        <div className="flex flex-row items-center gap-2 text-[13px] text-blue-800 font-mono p-2 pt-1 pb-0 select-all">
          <span className="bg-blue-50 border border-blue-100 px-2 py-0.5 rounded whitespace-nowrap" title="Session Token utilisateur">
            {sessionToken}
          </span>
          <button
            aria-label="Copier le token de session"
            type="button"
            className="text-blue-500 hover:text-blue-700 ml-1 px-1 py-0 rounded border border-transparent hover:border-blue-200 active:border-blue-300 transition-all focus:outline-none"
            onClick={handleCopySessionToken}
          >
            <Copy className="w-4 h-4 inline-block" />
            {copiedToken && <span className="text-green-500 ml-1">Copié !</span>}
          </button>
        </div>
      )}

      <ChatMessageArea
        messages={messages}
        showSuggestions={showSuggestions}
        userContext={getUserContext()}
        isLoading={isLoading || (loadingHistory && messages.length === 0) || isInitializing}
        onToggleBookmark={toggleBookmark}
        onSuggestionClick={handleSuggestionClick}
      />
      
      <ChatInputArea
        inputValue={inputValue}
        isLoading={isLoading || isInitializing || !isReady}
        onInputChange={setInputValue}
        onKeyPress={handleKeyPress}
        onSendMessage={() => handleSendMessage()}
      />
    </div>
  );
};
