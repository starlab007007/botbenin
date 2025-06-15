import React, { useState, useEffect, useMemo } from 'react';
import { useToast, toast } from '@/hooks/use-toast';
import { BookmarkedAdvice } from '@/components/BookmarkedAdvice';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessageArea } from '@/components/ChatMessageArea';
import { ChatInputArea } from '@/components/ChatInputArea';
import { BotConfigService } from '@/services/botConfigService';
import { useAuth } from '@/contexts/AuthContext';
import { saveChatMessage } from '@/services/chatService';
import { useBotMessageHistory } from '@/components/bot-conversation/hooks/useBotMessageHistory';
import { useSessionManager } from '@/hooks/useSessionManager';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isBookmarked?: boolean;
}

interface StandardizedChatInterfaceProps {
  botId: string;
  onBackToLanding: () => void;
  entryPoint?: string;
  isTest?: boolean;
  refCode?: string;
}

export const StandardizedChatInterface: React.FC<StandardizedChatInterfaceProps> = ({
  botId,
  onBackToLanding,
  entryPoint = 'direct',
  isTest = false,
  refCode
}) => {
  const { isGuest, guestUser, isAuthenticated } = useAuth();
  const [botConfig, setBotConfig] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [botConfigLoaded, setBotConfigLoaded] = useState(false);

  // Utiliser le hook de gestion de session
  const {
    sessionToken,
    isInitializing,
    isReady,
    error: sessionError,
    retryInitialization
  } = useSessionManager({
    botId,
    entryPoint
  });

  // Always provide sessionToken to useBotMessageHistory
  const {
    messages: historyMessages,
    loading: loadingHistory,
    error: errorHistory
  } = useBotMessageHistory(botId, sessionToken);

  useEffect(() => {
    const init = async () => {
      console.log(`[StandardizedChatInterface] Initializing for bot ${botId}, entry: ${entryPoint}`);
      await initializeBot();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId, entryPoint]);

  const initializeBot = async () => {
    try {
      setIsLoading(true);
      setHasError(false);

      console.log('=== INITIALISATION BOT STANDARDISÉ [debug complet] ===');
      console.log('Bot ID:', botId);
      console.log('Entry Point:', entryPoint, ' // Test:', isTest);
      console.log('Auth ctx:', { isAuthenticated, isGuest, guestUser });

      const accessCheck = await BotConfigService.checkPublicAccess(botId);

      console.log('Résultat checkPublicAccess:', accessCheck);

      if (!accessCheck.accessible) {
        setHasError(true);
        let errMsg = accessCheck.error || 'Bot non accessible';
        if (accessCheck.error && accessCheck.error.toLowerCase().includes('auth')) {
          errMsg = "Ce bot n'est pas public ou une authentification est exigée.";
        }
        setErrorMessage(errMsg);
        setBotConfigLoaded(true);
        return;
      }

      const config = accessCheck.config!;
      console.log('Configuration bot chargée:', config);

      const validation = BotConfigService.validateBotConfig(config);
      if (!validation.isValid) {
        console.warn('Configuration du bot invalide:', validation.errors);
      }

      setBotConfig(config);
      setBotConfigLoaded(true);

    } catch (error: any) {
      console.error('Erreur lors de l\'initialisation du bot:', error);
      setHasError(true);
      const errorContent = (typeof error === 'object' && error?.message) ? error.message : (typeof error === 'string' ? error : '');
      setErrorMessage('Impossible de charger ce bot. ' + (errorContent ? `(Erreur: ${errorContent})` : 'Veuillez réessayer plus tard.'));
      setBotConfigLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Améliorer la logique de chargement de page
  const pageIsLoading = !botConfigLoaded || isInitializing || (!botConfig && !hasError) || (!isReady && !sessionError) || (loadingHistory && messages.length === 0 && !errorHistory);

  useEffect(() => {
    if (botConfig && isReady && !loadingHistory) {
      const mappedHistory = historyMessages.map((item): Message => ({
        id: item.message_id,
        content: item.message_content,
        isUser: item.message_type === 'user',
        timestamp: new Date(item.message_timestamp),
      }));

      if (mappedHistory.length > 0) {
        setMessages(mappedHistory);
      } else {
        const welcomeMessage = BotConfigService.getStandardWelcomeMessage(
          botConfig.name || botConfig.chat_title,
          botConfig.chat_context
        );

        setMessages([{
          id: '1',
          content: welcomeMessage,
          isUser: false,
          timestamp: new Date(),
        }]);
      }
    }
  }, [historyMessages, botConfig, loadingHistory, isReady]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim() || isProcessing || !botConfig) return;

    // Vérification simplifiée de la session
    if (!isReady || !sessionToken) {
      toast({
        title: "Session en cours d'initialisation",
        description: "Veuillez patienter quelques instants...",
        variant: "destructive",
      });
      return;
    }

    console.log(`[StandardizedChatInterface] Sending message with session token: ${sessionToken}`);

    setShowSuggestions(false);

    const userDisplay = isGuest && guestUser
      ? guestUser.displayName
      : undefined;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      isUser: true,
      timestamp: new Date(),
      ...(userDisplay ? { content: `[${userDisplay}] ${textToSend}` } : {}),
    };

    // Sauvegarder le message utilisateur avec le token de session unifié
    if (sessionToken) {
      console.log(`[StandardizedChatInterface] Saving user message: bot=${botId}, token=${sessionToken}`);
      saveChatMessage(botId, sessionToken, textToSend, "user");
    }

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    console.log('=== COMMUNICATION WEBHOOK STANDARDISÉE ===');
    console.log('Bot:', botConfig.name);
    console.log('Message:', textToSend);
    console.log('Webhook URL:', botConfig.webhook_url);
    console.log('Session Token (vérifié):', sessionToken);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const headers = BotConfigService.getStandardWebhookHeaders(
        botId,
        botConfig.name,
        botConfig.chat_context,
        isTest
      );

      const payload = BotConfigService.createStandardWebhookPayload(
        textToSend,
        botId,
        botConfig.name,
        botConfig.chat_context,
        sessionToken, // Token de session unifié et vérifié
        isTest
      );

      console.log('Headers standardisés:', headers);
      console.log('Payload standardisé:', payload);

      const response = await fetch(botConfig.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      console.log('=== RÉPONSE WEBHOOK STANDARDISÉE ===');
      console.log('Status:', response.status);
      console.log('OK:', response.ok);

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
        throw new Error('Réponse vide du webhook');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedContent.trim(),
        isUser: false,
        timestamp: new Date(),
      };

      // Sauvegarder la réponse du bot avec le token de session unifié
      if (sessionToken) {
        console.log(`[StandardizedChatInterface] Saving bot response: bot=${botId}, token=${sessionToken}`);
        saveChatMessage(botId, sessionToken, processedContent.trim(), "bot");
      }

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('=== ERREUR COMMUNICATION WEBHOOK ===');
      console.error('Bot:', botConfig.name);
      console.error('Error:', error);
      
      let errorMessage = `Je rencontre des difficultés techniques avec "${botConfig.name}". Veuillez réessayer dans quelques instants.`;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `La requête vers "${botConfig.name}" a pris trop de temps. Veuillez réessayer.`;
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = `Impossible de se connecter à "${botConfig.name}". Vérifiez votre connexion internet.`;
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
        title: `${botConfig.name} - Problème technique`,
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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

  // Écran d'erreur standardisé
  if (hasError) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Bot non disponible
          </h2>
          <p className="text-gray-600 mb-4">
            {errorMessage}
          </p>
          <button
            onClick={() => { 
              setHasError(false); 
              setErrorMessage(''); 
              setBotConfigLoaded(false);
              initializeBot(); 
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700 mt-3 transition-colors"
          >
            Re-tester l'accès public
          </button>
          <button
            onClick={onBackToLanding}
            className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors mt-4 ml-2"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Écran de chargement standardisé
  if (pageIsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
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
        isLoading={isProcessing}
        bookmarkedCount={bookmarkedMessages.length}
        onShowBookmarks={() => setShowBookmarks(true)}
        title={botConfig?.name || botConfig?.chat_title || 'Assistant IA'}
      />
      
      <ChatMessageArea
        messages={messages}
        showSuggestions={showSuggestions}
        userContext={botConfig?.chat_context || 'general'}
        isLoading={isProcessing}
        onToggleBookmark={toggleBookmark}
        onSuggestionClick={handleSuggestionClick}
      />
      
      <ChatInputArea
        inputValue={inputValue}
        isLoading={isProcessing || !isReady}
        onInputChange={setInputValue}
        onKeyPress={handleKeyPress}
        onSendMessage={() => handleSendMessage()}
      />
    </div>
  );
};
