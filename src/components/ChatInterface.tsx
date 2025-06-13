
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BookmarkedAdvice } from '@/components/BookmarkedAdvice';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessageArea } from '@/components/ChatMessageArea';
import { ChatInputArea } from '@/components/ChatInputArea';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

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
  
  console.log('=== INITIALISATION CHATINTERFACE ===');
  
  // Récupérer les paramètres de l'URL (priorité sur les props)
  const urlBotId = searchParams.get('bot');
  const urlWebhookUrl = searchParams.get('webhook');
  const urlBotName = searchParams.get('bot_name');
  const urlChatTitle = searchParams.get('title');
  const urlChatContext = searchParams.get('context');
  const isTest = searchParams.get('test') === 'true';
  const isPublic = searchParams.get('public') === 'true';

  // Utiliser les paramètres URL en priorité, puis les props
  const webhookUrl = urlWebhookUrl ? decodeURIComponent(urlWebhookUrl) : propWebhookUrl;
  const chatTitle = urlChatTitle || urlBotName || propChatTitle;
  const chatContext = urlChatContext || propChatContext;
  const hasWebhook = Boolean(webhookUrl && webhookUrl.trim() !== '');

  console.log('Paramètres ChatInterface:', {
    urlBotId,
    urlBotName,
    urlChatTitle,
    urlChatContext,
    webhookUrl,
    chatTitle,
    chatContext,
    isTest,
    isPublic,
    hasWebhook
  });
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: getWelcomeMessage(chatContext, chatTitle, hasWebhook),
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { toast } = useToast();

  function getWelcomeMessage(context?: string, title?: string, hasWebhook?: boolean): string {
    const botName = title || 'Bot.Bj';
    
    if (!hasWebhook) {
      return `👋 Bonjour ! Je suis ${botName}. 

⚠️ **Configuration requise** : Ce bot n'a pas encore de webhook configuré. Pour que je puisse répondre à vos questions, l'administrateur doit configurer l'URL du webhook dans les paramètres du bot.

En attendant, vous pouvez explorer l'interface et voir comment elle fonctionne !`;
    }
    
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
    if (isPublic) {
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

    // Si pas de webhook, afficher un message d'information
    if (!hasWebhook) {
      console.log('Aucun webhook configuré - message informatif');
      
      const userMessage: Message = {
        id: Date.now().toString(),
        content: textToSend,
        isUser: true,
        timestamp: new Date(),
      };

      const infoMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Je vois que vous voulez discuter avec moi ! Malheureusement, ce bot n'a pas encore de webhook configuré, donc je ne peux pas traiter vos messages pour le moment.

🔧 **Pour l'administrateur** : Veuillez configurer l'URL du webhook dans les paramètres du bot pour activer les réponses automatiques.

💡 **En attendant** : Vous pouvez explorer l'interface et tester l'expérience utilisateur !`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage, infoMessage]);
      setInputValue('');
      
      toast({
        title: `${chatTitle} - Configuration requise`,
        description: "Webhook manquant. L'interface est disponible mais les réponses automatiques ne sont pas activées.",
        variant: "default",
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

    console.log('=== COMMUNICATION N8N POUR BOT SPÉCIFIQUE ===');
    console.log('Bot ID:', urlBotId);
    console.log('Bot Name:', urlBotName || chatTitle);
    console.log('User message:', textToSend);
    console.log('Webhook URL utilisée:', webhookUrl);
    console.log('Chat Context:', chatContext);
    console.log('Chat Title:', chatTitle);
    console.log('Is Test Mode:', isTest);
    console.log('Is Public Access:', isPublic);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout après 30 secondes');
        controller.abort();
      }, 30000);

      // Payload enrichi avec les informations spécifiques du bot
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
        is_public_access: isPublic,
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
          'X-Bot-Name': encodeURIComponent(urlBotName || chatTitle),
          'X-Webhook-Source': 'bot_specific',
          'X-Chat-Context': chatContext || 'automation',
          'X-Is-Test': isTest ? 'true' : 'false',
          'X-Is-Public': isPublic ? 'true' : 'false'
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

      console.log('Message IA ajouté (depuis N8N):', aiMessage);
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('=== ERREUR COMMUNICATION N8N BOT SPÉCIFIQUE ===');
      console.error('Bot ID:', urlBotId);
      console.error('Bot Name:', urlBotName || chatTitle);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      console.error('Webhook URL utilisé:', webhookUrl);
      
      let errorMessage = `Je rencontre des difficultés techniques avec le webhook N8N configuré pour "${urlBotName || chatTitle}". Veuillez vérifier la configuration de votre webhook.`;
      let toastMessage = `Problème de connexion N8N - ${urlBotName || chatTitle}`;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `La requête vers N8N pour "${urlBotName || chatTitle}" a pris trop de temps. Le système pourrait être occupé. Veuillez réessayer.`;
          toastMessage = `Timeout N8N - ${urlBotName || chatTitle}`;
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = `Impossible de se connecter à N8N pour "${urlBotName || chatTitle}". Vérifiez que l'URL webhook est correcte et accessible.`;
          toastMessage = `Problème de connectivité N8N - ${urlBotName || chatTitle}`;
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
        title: `${chatTitle} - Problème technique N8N`,
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
      
      {!hasWebhook && (
        <Alert className="mx-4 mt-4 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Configuration requise :</strong> Ce bot n'a pas de webhook configuré. 
            L'interface est fonctionnelle mais les réponses automatiques ne sont pas activées.
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
