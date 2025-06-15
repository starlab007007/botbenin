import React, { useState, useEffect } from 'react';
import { useToast, toast } from '@/hooks/use-toast';
import { BookmarkedAdvice } from '@/components/BookmarkedAdvice';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessageArea } from '@/components/ChatMessageArea';
import { ChatInputArea } from '@/components/ChatInputArea';
import { BotConfigService } from '@/services/botConfigService';
import { initializeVisitorTracking, getCurrentVisitorSession } from '@/utils/visitorTracking';
import { useAuth } from '@/contexts/AuthContext';
import { saveChatMessage } from '@/services/chatService';
import { useBotMessageHistory } from '@/components/bot-conversation/hooks/useBotMessageHistory';

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
  const [apiAccessLog, setApiAccessLog] = useState<any>(null);
  const [accessCheckRaw, setAccessCheckRaw] = useState<any>(null);
  const [supabaseDebugInfo, setSupabaseDebugInfo] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(getCurrentVisitorSession());
  const [pendingSend, setPendingSend] = useState<string | null>(null);

  // Always provide sessionToken to useBotMessageHistory
  const {
    messages: historyMessages,
    loading: loadingHistory,
    error: errorHistory
  } = useBotMessageHistory(botId, sessionToken);

  useEffect(() => {
    const init = async () => {
      console.log(`[StandardizedChatInterface] Initializing tracking for bot ${botId}, entry: ${entryPoint}`);
      const token = await initializeVisitorTracking(botId, entryPoint);
      console.log(`[StandardizedChatInterface] Tracking initialized, token: ${token}`);
      setSessionToken(token);
      initializeBot();
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
      setApiAccessLog(accessCheck);
      setAccessCheckRaw(accessCheck);

      if (accessCheck && accessCheck.config) {
        setSupabaseDebugInfo({
          received: accessCheck.config,
          share_enabled: accessCheck.config.share_enabled,
          is_active: accessCheck.config.is_active,
          webhook_url: accessCheck.config.webhook_url,
          error: accessCheck.error,
        });
      } else {
        setSupabaseDebugInfo({ ...accessCheck, no_config: true });
      }

      console.log('Résultat checkPublicAccess:', accessCheck);

      if (!accessCheck.accessible) {
        setHasError(true);
        let errMsg = accessCheck.error || 'Bot non accessible';
        if (accessCheck.error && accessCheck.error.toLowerCase().includes('auth')) {
          errMsg = "Ce bot n'est pas public ou une authentification est exigée.";
        }
        setErrorMessage(errMsg);
        return;
      }

      const config = accessCheck.config!;
      console.log('Configuration bot chargée:', config);

      const validation = BotConfigService.validateBotConfig(config);
      if (!validation.isValid) {
        console.warn('Configuration du bot invalide:', validation.errors);
      }

      setBotConfig(config);

    } catch (error: any) {
      console.error('Erreur lors de l\'initialisation du bot:', error);
      setHasError(true);
      const errorContent = (typeof error === 'object' && error?.message) ? error.message : (typeof error === 'string' ? error : '');
      setErrorMessage('Impossible de charger ce bot. ' + (errorContent ? `(Erreur: ${errorContent})` : 'Veuillez réessayer plus tard.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (botConfig) {
      const mappedHistory = historyMessages.map((item): Message => ({
        id: item.message_id,
        content: item.message_content,
        isUser: item.message_type === 'user',
        timestamp: new Date(item.message_timestamp),
      }));

      if (mappedHistory.length > 0) {
        setMessages(mappedHistory);
      } else if (!loadingHistory) {
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
  }, [historyMessages, botConfig, loadingHistory]);

  // Attente explicite si on a une demande d’envoi en attente et que le token s’est initialisé
  useEffect(() => {
    if (pendingSend && sessionToken) {
      handleSendMessage(pendingSend);
      setPendingSend(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken, pendingSend]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim() || isProcessing || !botConfig) return;

    // Si le token est en phase de génération, on patiente et on stocke le message en attente
    if (!sessionToken && isLoading) {
      setPendingSend(textToSend);
      return;
    }

    let currentToken = sessionToken || getCurrentVisitorSession();

    if (!currentToken && botId) {
      currentToken = await initializeVisitorTracking(botId, 'chat_send_recovery');
      if (currentToken) {
        setSessionToken(currentToken);
        setPendingSend(textToSend);
        return;
      }
    }

    if (!currentToken) {
      console.error('[StandardizedChatInterface] Aucun token de session disponible, even after recovery attempt.');
      toast({
        title: "Erreur de session",
        description: "Impossible d'envoyer le message. Veuillez recharger la page (problème de session).",
        variant: "destructive",
      });
      return;
    }

    console.log(`[StandardizedChatInterface] Sending message with session token: ${currentToken}`);

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

    if (currentToken) {
      console.log(`[StandardizedChatInterface] Saving user message to database: bot=${botId}, token=${currentToken}`);
      saveChatMessage(botId, currentToken, textToSend, "user");
    }

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    console.log('=== COMMUNICATION WEBHOOK STANDARDISÉE ===');
    console.log('Bot:', botConfig.name);
    console.log('Message:', textToSend);
    console.log('Webhook URL:', botConfig.webhook_url);
    console.log('Session Token:', currentToken);

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
        currentToken, // Passer le session token unifié
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

      if (currentToken) {
        console.log(`[StandardizedChatInterface] Saving bot response to database: bot=${botId}, token=${currentToken}`);
        saveChatMessage(botId, currentToken, processedContent.trim(), "bot");
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

  const pageIsLoading = isLoading || (loadingHistory && messages.length === 0);

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
          {apiAccessLog && (
            <pre className="bg-red-50 text-xs text-gray-700 rounded p-2 my-2 text-left max-h-64 overflow-auto">
              {JSON.stringify(apiAccessLog, null, 2)}
            </pre>
          )}
          {supabaseDebugInfo && (
            <div className="my-2 p-2 rounded bg-yellow-50 text-xs text-left max-h-64 overflow-auto border border-yellow-200 text-yellow-800">
              <b>Debug table bots:</b><br />
              <span>
                <b>is_active:</b> {String(supabaseDebugInfo.share_enabled === undefined ? 'Non reçu' : supabaseDebugInfo.is_active + '')} 
                {' / '} <b>share_enabled:</b> {String(supabaseDebugInfo.share_enabled === undefined ? 'Non reçu' : supabaseDebugInfo.share_enabled + '')}
                <br />
                <b>webhook_url:</b> {supabaseDebugInfo.webhook_url ?? "Non reçu"}
                <br />
                <b>Erreur SQL brute:</b> {supabaseDebugInfo?.error ?? 'aucune'}
                <br />
                <b>Payload complète:</b><br />
                <pre className="bg-transparent">{JSON.stringify(supabaseDebugInfo, null, 2)}</pre>
              </span>
            </div>
          )}
          <button
            onClick={() => { 
              setApiAccessLog(null); 
              setSupabaseDebugInfo(null); 
              setHasError(false); 
              setErrorMessage(''); 
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
        isLoading={isProcessing}
        onInputChange={setInputValue}
        onKeyPress={handleKeyPress}
        onSendMessage={() => handleSendMessage()}
      />
    </div>
  );
};
