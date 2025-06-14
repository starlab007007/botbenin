import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BookmarkedAdvice } from '@/components/BookmarkedAdvice';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessageArea } from '@/components/ChatMessageArea';
import { ChatInputArea } from '@/components/ChatInputArea';
import { BotConfigService } from '@/services/botConfigService';
import { initializeVisitorTracking } from '@/utils/visitorTracking';
import { useAuth } from '@/contexts/AuthContext';

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
  const { toast } = useToast();

  useEffect(() => {
    initializeBot();
  }, [botId]);

  const initializeBot = async () => {
    try {
      setIsLoading(true);
      setHasError(false);

      console.log('=== INITIALISATION BOT STANDARDISÉ ===');
      console.log('Bot ID:', botId);
      console.log('Entry Point:', entryPoint);
      console.log('Is Test:', isTest);
      console.log('Contexte auth:', {
        isAuthenticated,
        isGuest,
        guestUser,
      });

      // Vérifier l'accès public au bot; log le retour brut
      const accessCheck = await BotConfigService.checkPublicAccess(botId);

      setApiAccessLog(accessCheck); // Pour inspection dans l'UI de debug

      console.log('Résultat checkPublicAccess:', accessCheck);

      if (!accessCheck.accessible) {
        setHasError(true);
        // Si renvoi error et non guest: donner msg explicite
        if (accessCheck.error && accessCheck.error.toLowerCase().includes('auth')) {
          setErrorMessage("Ce bot n'est pas public ou une authentification est exigée.");
        } else {
          setErrorMessage(accessCheck.error || 'Bot non accessible');
        }
        return;
      }

      const config = accessCheck.config!;
      console.log('Configuration bot chargée:', config);

      // Valider la configuration
      const validation = BotConfigService.validateBotConfig(config);
      if (!validation.isValid) {
        console.warn('Configuration du bot invalide:', validation.errors);
        // Continuer avec des valeurs par défaut si nécessaire
      }

      setBotConfig(config);

      // Initialiser le message de bienvenue standardisé
      const welcomeMessage = BotConfigService.getStandardWelcomeMessage(
        config.name || config.chat_title,
        config.chat_context
      );

      setMessages([{
        id: '1',
        content: welcomeMessage,
        isUser: false,
        timestamp: new Date(),
      }]);

      // Initialiser le tracking du visiteur
      try {
        await initializeVisitorTracking(botId, entryPoint);
        console.log('Tracking visiteur initialisé');
      } catch (trackingError) {
        console.warn('Erreur lors de l\'initialisation du tracking:', trackingError);
      }

    } catch (error) {
      console.error('Erreur lors de l\'initialisation du bot:', error);
      setHasError(true);
      setErrorMessage('Impossible de charger ce bot. Veuillez réessayer plus tard.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim() || isProcessing || !botConfig) return;

    // Vérification critique du webhook URL
    if (!botConfig.webhook_url || botConfig.webhook_url.trim() === '') {
      console.error('ERREUR CRITIQUE: Aucun webhook URL configuré pour ce bot');
      
      toast({
        title: `${botConfig.name} - Configuration manquante`,
        description: "Ce bot n'a pas de webhook URL configuré. Veuillez contacter l'administrateur.",
        variant: "destructive",
      });
      return;
    }

    setShowSuggestions(false);

    // Utilise le nom du guest comme nom dans l’historique local (possible customisation Supabase à faire côté backend si besoin)
    const userDisplay = isGuest && guestUser
      ? guestUser.displayName
      : undefined;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      isUser: true,
      timestamp: new Date(),
      // customisation
      ...(userDisplay ? { content: `[${userDisplay}] ${textToSend}` } : {}),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    console.log('=== COMMUNICATION WEBHOOK STANDARDISÉE ===');
    console.log('Bot:', botConfig.name);
    console.log('Message:', textToSend);
    console.log('Webhook URL:', botConfig.webhook_url);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Utiliser les headers et payload standardisés
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
        undefined,
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

  // Écran d'erreur standardisé
  if (hasError) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Bot non disponible
          </h2>
          <p className="text-gray-600 mb-4">
            {errorMessage}
          </p>
          {/* Bloc debug si accès logué */}
          {apiAccessLog && (
            <pre className="bg-red-50 text-xs text-gray-700 rounded p-2 my-2 text-left max-h-40 overflow-auto">
              {JSON.stringify(apiAccessLog, null, 2)}
            </pre>
          )}
          <button
            onClick={onBackToLanding}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Écran de chargement standardisé
  if (isLoading) {
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
