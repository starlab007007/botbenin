import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast, toast } from '@/hooks/use-toast';
import { BookmarkedAdvice } from '@/components/BookmarkedAdvice';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessageArea } from '@/components/ChatMessageArea';
import { ChatInputArea } from '@/components/ChatInputArea';
import { BotConfigService } from '@/services/botConfigService';
import { useAuth } from '@/contexts/AuthContext';
import { saveChatMessage, testMessageRetrieval } from '@/services/chat';
import { useBotMessageHistory } from '@/components/bot-conversation/hooks/useBotMessageHistory';
import { useSessionManager } from '@/hooks/useSessionManager';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isBookmarked?: boolean;
  isHistoryMessage?: boolean; // Nouveau champ pour marquer les messages d'historique
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [initializationComplete, setInitializationComplete] = useState(false);

  // Use session manager hook
  const {
    sessionToken,
    isInitializing: sessionInitializing,
    isReady: sessionReady,
    error: sessionError,
    retryInitialization
  } = useSessionManager({
    botId,
    entryPoint
  });

  // Use bot message history - only when we have both bot config and session
  const {
    messages: historyMessages,
    loading: loadingHistory,
    error: errorHistory
  } = useBotMessageHistory(
    botConfig ? botId : null, // Only fetch when bot config is loaded
    sessionReady ? sessionToken : null // Only fetch when session is ready
  );

  // Memoized callback for initialization
  const initializeBot = useCallback(async () => {
    try {
      setHasError(false);

      console.log('=== INITIALIZING STANDARDIZED BOT ===');
      console.log('Bot ID:', botId);
      console.log('Entry Point:', entryPoint, ' // Test:', isTest);
      console.log('Auth context:', { isAuthenticated, isGuest, guestUser });

      const accessCheck = await BotConfigService.checkPublicAccess(botId);

      console.log('Public access check result:', accessCheck);

      if (!accessCheck.accessible) {
        setHasError(true);
        let errMsg = accessCheck.error || 'Bot non accessible';
        if (accessCheck.error && accessCheck.error.toLowerCase().includes('auth')) {
          errMsg = "Ce bot n'est pas public ou une authentification est exigée.";
        }
        setErrorMessage(errMsg);
        setInitializationComplete(true);
        return;
      }

      const config = accessCheck.config!;
      console.log('Bot configuration loaded:', config);

      const validation = BotConfigService.validateBotConfig(config);
      if (!validation.isValid) {
        console.warn('Invalid bot configuration:', validation.errors);
      }

      setBotConfig(config);
      setInitializationComplete(true);

    } catch (error: any) {
      console.error('Error during bot initialization:', error);
      setHasError(true);
      const errorContent = (typeof error === 'object' && error?.message) ? error.message : (typeof error === 'string' ? error : '');
      setErrorMessage('Impossible de charger ce bot. ' + (errorContent ? `(Erreur: ${errorContent})` : 'Veuillez réessayer plus tard.'));
      setInitializationComplete(true);
    }
  }, [botId, entryPoint, isTest, isAuthenticated, isGuest, guestUser]);

  useEffect(() => {
    initializeBot();
  }, [initializeBot]);

  // Simplified loading logic - much more permissive
  const isLoading = useMemo(() => {
    // Still initializing the bot config
    if (!initializationComplete) return true;
    
    // If there's an error, don't load
    if (hasError) return false;
    
    // If no bot config after initialization, don't load
    if (!botConfig) return false;
    
    // Session is still initializing
    if (sessionInitializing) return true;
    
    // If session has error, don't load
    if (sessionError) return false;
    
    // Loading is complete when we have session ready OR when session is not required
    return false;
  }, [initializationComplete, hasError, botConfig, sessionInitializing, sessionError]);

  useEffect(() => {
    if (botConfig && sessionReady && !loadingHistory) {
      const mappedHistory = historyMessages.map((item): Message => ({
        id: item.message_id,
        content: item.message_content,
        isUser: item.message_type === 'user',
        timestamp: new Date(item.message_timestamp),
        isHistoryMessage: true, // Marquer comme message d'historique
      }));

      if (mappedHistory.length > 0) {
        console.log(`[StandardizedChatInterface] Loaded ${mappedHistory.length} messages from history`);
        setMessages(mappedHistory);
      } else {
        const welcomeMessage = BotConfigService.getStandardWelcomeMessage(
          botConfig.name || botConfig.chat_title,
          botConfig.chat_context
        );

        console.log('[StandardizedChatInterface] No history found, setting welcome message');
        setMessages([{
          id: '1',
          content: welcomeMessage,
          isUser: false,
          timestamp: new Date(),
          isHistoryMessage: true, // Le message de bienvenue est aussi considéré comme historique
        }]);
      }
    }
  }, [historyMessages, botConfig, loadingHistory, sessionReady]);

  // Optimized message sending with useCallback
  const handleSendMessage = useCallback(async (messageText?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim() || isProcessing || !botConfig) return;

    // More lenient session check - allow sending even if session is still initializing
    if (sessionError) {
      toast({
        title: "Erreur de session",
        description: "Problème avec votre session. Veuillez rafraîchir la page.",
        variant: "destructive",
      });
      return;
    }

    console.log(`[StandardizedChatInterface] === SENDING MESSAGE ===`);

    setShowSuggestions(false);

    const userDisplay = isGuest && guestUser
      ? guestUser.displayName
      : undefined;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      isUser: true,
      timestamp: new Date(),
      isHistoryMessage: false, // Nouveau message, pas d'historique
      ...(userDisplay ? { content: `[${userDisplay}] ${textToSend}` } : {}),
    };

    // Save user message if session token available
    if (sessionToken) {
      try {
        const messageId = await saveChatMessage(botId, sessionToken, textToSend, "user");
        console.log(`[StandardizedChatInterface] User message saved with ID: ${messageId}`);
      } catch (saveError) {
        console.warn('[StandardizedChatInterface] Failed to save user message:', saveError);
        // Continue without blocking
      }
    }

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Reduced timeout for faster response

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
        sessionToken || 'fallback_session',
        isTest
      );

      const response = await fetch(botConfig.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
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
        throw new Error('Réponse vide du webhook');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedContent.trim(),
        isUser: false,
        timestamp: new Date(),
        isHistoryMessage: false, // Nouveau message, pas d'historique - aura l'animation
      };

      // Save bot response if session token available
      if (sessionToken) {
        try {
          const responseId = await saveChatMessage(botId, sessionToken, processedContent.trim(), "bot");
          console.log(`[StandardizedChatInterface] Bot response saved with ID: ${responseId}`);
        } catch (saveError) {
          console.warn('[StandardizedChatInterface] Failed to save bot response:', saveError);
        }
      }

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('=== WEBHOOK COMMUNICATION ERROR ===', error);
      
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
        isHistoryMessage: false, // Message d'erreur, pas d'historique
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
  }, [inputValue, isProcessing, botConfig, sessionError, sessionToken, isGuest, guestUser, botId, isTest]);

  // Memoized callbacks
  const handleSuggestionClick = useCallback((suggestion: any) => {
    handleSendMessage(suggestion.action);
  }, [handleSendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const toggleBookmark = useCallback((messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, isBookmarked: !msg.isBookmarked }
          : msg
      )
    );
  }, []);

  const bookmarkedMessages = useMemo(() => 
    messages.filter(msg => msg.isBookmarked && !msg.isUser), 
    [messages]
  );

  // Session error display
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

  // Standardized error screen
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
              setInitializationComplete(false);
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

  // Much simplified loading screen - only show when truly loading
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Chargement du chat...
          </h2>
          <p className="text-gray-600">Préparation de votre assistant IA</p>
          <p className="text-sm text-gray-500 mt-2">
            Bot: {botConfig?.name || 'Configuration en cours...'}
          </p>
          <p className="text-sm text-gray-500">
            Session: {sessionReady ? 'Prête' : sessionInitializing ? 'Initialisation...' : 'En attente'}
          </p>
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
        isLoading={isProcessing}
        onInputChange={setInputValue}
        onKeyPress={handleKeyPress}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};
