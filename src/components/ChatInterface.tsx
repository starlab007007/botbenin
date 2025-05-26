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
  webhookUrl = 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/chat-webhook',
  chatTitle = 'Bot.Bj Assistant',
  chatContext
}) => {
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: getWelcomeMessage(chatContext),
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const { toast } = useToast();

  function getWelcomeMessage(context?: string): string {
    switch (context) {
      case 'services_locaux':
        return "🏢 Bonjour ! Je suis votre assistant IA pour les services locaux. Je peux vous aider à trouver des restaurants, hôtels, commerces et autres services dans votre région. Que recherchez-vous aujourd'hui ?";
      case 'restaurant':
        return "🍽️ Bonjour ! Je suis votre assistant IA pour la réservation de restaurants. Je peux vous aider à trouver le restaurant parfait, vérifier les disponibilités et faire votre réservation. Quel type de restaurant recherchez-vous ?";
      default:
        return "🚀 Bonjour ! Je suis Bot.Bj, votre assistant IA intelligent. Je peux vous aider avec vos processus métiers, marketing, gestion et services citoyens. Que souhaitez-vous accomplir aujourd'hui ?";
    }
  }

  // Determine user context based on current route or provided context
  const getUserContext = (): 'business' | 'marketing' | 'gestion' | 'citoyen' | 'services_locaux' | 'restaurant' | 'general' => {
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
    console.log('Webhook URL:', webhookUrl);

    try {
      const requestPayload = {
        message: textToSend,
        bot_id: 'default-bot-id', // À remplacer par l'ID réel du bot
        user_session: sessionId,
        user_email: null, // Peut être rempli si l'utilisateur est connecté
        user_name: null, // Peut être rempli si l'utilisateur est connecté
        ip_address: null,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        context: chatContext || 'general'
      };

      console.log('Request payload:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Bot.Bj-Platform/1.0',
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('Response received!');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('JSON Response:', JSON.stringify(responseData, null, 2));
      
      const processedContent = responseData.output || 
                              responseData.message || 
                              responseData.response || 
                              'Réponse reçue mais format inattendu.';

      console.log('Processed content:', processedContent);

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
      
      const errorMessage = "Je rencontre des difficultés techniques. Laissez-moi vous proposer une assistance générale en attendant.";
      
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorMessage,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, fallbackMessage]);
      
      toast({
        title: `${chatTitle} - Problème technique`,
        description: "Problème de connexion au service",
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
