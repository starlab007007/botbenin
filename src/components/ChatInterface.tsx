import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BookmarkedAdvice } from '@/components/BookmarkedAdvice';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessageArea } from '@/components/ChatMessageArea';
import { ChatInputArea } from '@/components/ChatInputArea';
import { useLocation } from 'react-router-dom';

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
  webhookUrl,
  chatTitle = 'Bot.Bj Assistant',
  chatContext
}) => {
  const location = useLocation();
  
  // Déterminer l'URL webhook à utiliser
  const finalWebhookUrl = webhookUrl || getDefaultWebhookUrl(chatContext);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: getWelcomeMessage(chatContext, chatTitle),
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { toast } = useToast();

  function getDefaultWebhookUrl(context?: string): string {
    // URLs par défaut pour les contexts existants
    switch (context) {
      case 'restaurant':
        return 'https://ia.bot.bj/webhook/iphoneshop1';
      case 'services_locaux':
        return 'https://ia.bot.bj/webhook/services_locaux';
      case 'automation':
        // Pour les bots automatisés, utiliser l'URL fournie ou une URL par défaut
        return 'https://ia.bot.bj/webhook/automation';
      default:
        return 'https://ia.bot.bj/webhook/iphoneshop1';
    }
  }

  function getWelcomeMessage(context?: string, title?: string): string {
    const botName = title || 'Bot.Bj';
    
    switch (context) {
      case 'services_locaux':
        return `🏢 Bonjour ! Je suis ${botName}, votre assistant IA pour les services locaux. Je peux vous aider à trouver des restaurants, hôtels, commerces et autres services dans votre région. Que recherchez-vous aujourd'hui ?`;
      case 'restaurant':
        return `🍽️ Bonjour ! Je suis ${botName}, votre assistant IA pour la réservation de restaurants. Je peux vous aider à trouver le restaurant parfait, vérifier les disponibilités et faire votre réservation. Quel type de restaurant recherchez-vous ?`;
      case 'automation':
        return `🤖 Bonjour ! Je suis ${botName}, votre assistant IA automatisé. Je suis connecté à un système N8N qui me permet de vous aider avec une large gamme de tâches. Comment puis-je vous assister aujourd'hui ?`;
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

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim() || isLoading) return;

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

    console.log('=== BOT.BJ WEBHOOK DEBUG START ===');
    console.log('User message:', textToSend);
    console.log('Webhook URL:', finalWebhookUrl);
    console.log('Chat Context:', chatContext);
    console.log('Chat Title:', chatTitle);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout after 30 seconds');
        controller.abort();
      }, 30000);

      const requestPayload = {
        message: textToSend,
        timestamp: new Date().toISOString(),
        session_id: `bot_bj_session_${chatContext || 'general'}_${Date.now()}`,
        user_id: 'bot_bj_user',
        source: 'bot_bj_platform',
        context: chatContext || 'general',
        chat_title: chatTitle,
        bot_type: chatContext === 'automation' ? 'dashboard_created' : 'predefined',
        interface_type: 'full_chat_interface'
      };

      console.log('Request payload:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch(finalWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Bot.Bj-Platform/1.0',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      console.log('Response received!');
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
        console.log('JSON Response:', JSON.stringify(responseData, null, 2));
        
        processedContent = responseData.output || 
                          responseData.message || 
                          responseData.response || 
                          responseData.text || 
                          responseData.content ||
                          responseData.reply ||
                          (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
      } else {
        responseData = await response.text();
        console.log('Text Response:', responseData);
        processedContent = responseData;
      }

      console.log('Processed content:', processedContent);

      if (!processedContent || processedContent.trim() === '') {
        throw new Error('Empty or invalid response from webhook');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedContent.trim(),
        isUser: false,
        timestamp: new Date(),
      };

      console.log('Adding AI message:', aiMessage);
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('=== BOT.BJ WEBHOOK ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      
      let errorMessage = "Je rencontre des difficultés techniques. Laissez-moi vous proposer une assistance générale en attendant.";
      let toastMessage = "Problème de connexion";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "La requête a pris trop de temps. Le système pourrait être occupé. Veuillez réessayer.";
          toastMessage = "Timeout - réessayez";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Impossible de se connecter au système. Vérifiez votre connexion internet et réessayez.";
          toastMessage = "Problème de connectivité";
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
      console.log('=== BOT.BJ WEBHOOK DEBUG END ===');
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
