import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BookmarkedAdvice } from '@/components/BookmarkedAdvice';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessageArea } from '@/components/ChatMessageArea';
import { ChatInputArea } from '@/components/ChatInputArea';
import { useLocation, useSearchParams } from 'react-router-dom';

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
  
  console.log('=== CHATINTERFACE - ACCÈS PUBLIC SIMPLIFIÉ ===');
  
  // Récupérer les paramètres de l'URL
  const urlBotId = searchParams.get('bot');
  const urlWebhookUrl = searchParams.get('webhook');
  const urlBotName = searchParams.get('bot_name');
  const urlChatTitle = searchParams.get('title');
  const urlChatContext = searchParams.get('context');
  const isPublic = searchParams.get('public') === 'true';
  const shareEnabled = searchParams.get('share_enabled') === 'true';
  const isConfigured = searchParams.get('configured') === 'true';

  // Configuration finale - PRIORITÉ AU PUBLIC
  const webhookUrl = urlWebhookUrl ? decodeURIComponent(urlWebhookUrl) : propWebhookUrl;
  const chatTitle = urlChatTitle || urlBotName || propChatTitle;
  const chatContext = urlChatContext || propChatContext || 'public';
  
  // LOGIQUE PUBLIQUE SIMPLIFIÉE : Si c'est public, c'est toujours fonctionnel
  const isPublicAccess = isPublic && shareEnabled;
  const hasWebhook = Boolean(webhookUrl && webhookUrl.trim() !== '');
  const canChat = isPublicAccess || hasWebhook; // Public = toujours OK

  console.log('=== CONFIGURATION FINALE ===', {
    botId: urlBotId,
    chatTitle,
    chatContext,
    isPublic,
    shareEnabled,
    isConfigured,
    hasWebhook,
    canChat: canChat ? 'OUI' : 'NON',
    webhookUrl: webhookUrl || 'AUCUN'
  });
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: getWelcomeMessage(chatContext, chatTitle, isPublicAccess),
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { toast } = useToast();

  function getWelcomeMessage(context?: string, title?: string, isPublicAccess?: boolean): string {
    const botName = title || 'Assistant Public';
    const publicPrefix = isPublicAccess ? '🌐 ' : '';
    
    if (isPublicAccess) {
      return `${publicPrefix}🚀 Bonjour ! Je suis ${botName}, votre assistant IA public.

✨ **Accès libre** : Aucune inscription requise !
💬 **Chat instantané** : Posez-moi toutes vos questions
🤖 **IA avancée** : Je suis là pour vous aider

Comment puis-je vous assister aujourd'hui ?`;
    }
    
    switch (context) {
      case 'services_locaux':
        return `🏢 Bonjour ! Je suis ${botName}, votre assistant pour les services locaux. Comment puis-je vous aider ?`;
      case 'restaurant':
        return `🍽️ Bonjour ! Je suis ${botName}, votre assistant pour les restaurants. Que recherchez-vous ?`;
      default:
        return `🤖 Bonjour ! Je suis ${botName}, votre assistant IA. Comment puis-je vous aider ?`;
    }
  }

  // Contexte utilisateur simplifié pour public - Fixed to map 'public' to 'general'
  const getUserContext = (): 'business' | 'marketing' | 'gestion' | 'citoyen' | 'services_locaux' | 'restaurant' | 'automation' | 'general' => {
    if (isPublicAccess || chatContext === 'public') return 'general';
    if (chatContext) return chatContext as 'business' | 'marketing' | 'gestion' | 'citoyen' | 'services_locaux' | 'restaurant' | 'automation' | 'general';
    return 'general';
  };

  // Gestion du retour
  const handleBackToLanding = () => {
    if (isPublicAccess) {
      console.log('Fermeture du chat public');
      window.location.href = 'https://bot.bj';
    } else {
      onBackToLanding();
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setShowSuggestions(false);
    setIsLoading(true);

    console.log('=== ENVOI MESSAGE PUBLIC ===');
    console.log('Message:', textToSend);
    console.log('Bot ID:', urlBotId);
    console.log('Accès public:', isPublicAccess);
    console.log('Webhook disponible:', hasWebhook);

    try {
      let responseMessage: Message;

      // Si on a un webhook, l'utiliser
      if (hasWebhook && webhookUrl) {
        console.log('=== COMMUNICATION WEBHOOK ===');
        console.log('URL Webhook:', webhookUrl);

        const requestPayload = {
          message: textToSend,
          timestamp: new Date().toISOString(),
          session_id: `public_${urlBotId || 'bot'}_${Date.now()}`,
          user_id: `public_user_${Date.now()}`,
          source: 'bot_bj_public',
          context: chatContext || 'public',
          chat_title: chatTitle,
          bot_id: urlBotId,
          bot_name: chatTitle,
          platform: 'bot_bj',
          is_public_access: true,
          access_type: 'public_no_auth'
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Bot.Bj-Public/1.0',
            'X-Bot-Platform': 'bot_bj',
            'X-Access-Type': 'public',
            'X-Bot-ID': urlBotId || 'public-bot',
            'X-Is-Public': 'true'
          },
          body: JSON.stringify(requestPayload),
          signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
          throw new Error(`Webhook error: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        let responseData;

        if (contentType.includes('application/json')) {
          responseData = await response.json();
          const content = responseData.output || 
                         responseData.message || 
                         responseData.response || 
                         responseData.text || 
                         responseData.content ||
                         responseData.reply ||
                         JSON.stringify(responseData);
          
          responseMessage = {
            id: (Date.now() + 1).toString(),
            content: content.trim(),
            isUser: false,
            timestamp: new Date(),
          };
        } else {
          const textResponse = await response.text();
          responseMessage = {
            id: (Date.now() + 1).toString(),
            content: textResponse.trim(),
            isUser: false,
            timestamp: new Date(),
          };
        }
      } else {
        // Mode démo pour accès public sans webhook
        console.log('=== MODE DÉMO PUBLIC ===');
        
        responseMessage = {
          id: (Date.now() + 1).toString(),
          content: `Merci pour votre message ! 

🌐 **Accès public actif** : Vous utilisez ${chatTitle} en mode public.

💬 **Votre message** : "${textToSend}"

🤖 **Réponse** : Je suis un assistant IA public. ${hasWebhook ? 'Le webhook est en cours de configuration.' : 'L\'accès est libre et sans restriction !'}

✨ Continuez à me poser vos questions, je suis là pour vous aider !`,
          isUser: false,
          timestamp: new Date(),
        };
      }

      setMessages(prev => [...prev, responseMessage]);

    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `⚠️ Une erreur temporaire s'est produite avec ${chatTitle}.

🔧 **Statut** : ${hasWebhook ? 'Problème de connexion webhook' : 'Mode démo actif'}
🌐 **Accès public** : Toujours disponible
🔄 **Solution** : Réessayez votre message

L'accès public reste ouvert à tous !`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Erreur temporaire",
        description: "Problème de connexion. Réessayez dans un moment.",
        variant: "default",
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
