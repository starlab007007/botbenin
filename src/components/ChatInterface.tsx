
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
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onBackToLanding }) => {
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "🚀 Bonjour ! Je suis Bot.Bj, votre assistant IA intelligent. Je peux vous aider avec vos processus métiers, marketing, gestion et services citoyens. Que souhaitez-vous accomplir aujourd'hui ?",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { toast } = useToast();

  // Determine user context based on current route
  const getUserContext = (): 'business' | 'marketing' | 'gestion' | 'citoyen' | 'general' => {
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
    console.log('Webhook URL:', 'https://ia.bot.bj/webhook/iphoneshop1');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout after 30 seconds');
        controller.abort();
      }, 30000);

      const requestPayload = {
        message: textToSend,
        timestamp: new Date().toISOString(),
        session_id: 'bot_bj_session',
        user_id: 'bot_bj_user',
        source: 'bot_bj_platform'
      };

      console.log('Request payload:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch('https://ia.bot.bj/webhook/iphoneshop1', {
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
        throw new Error('Empty or invalid response from Bot.Bj webhook');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedContent.trim(),
        isUser: false,
        timestamp: new Date(),
      };

      console.log('Adding AI message:', aiMessage);
      setMessages(prev => [...prev, aiMessage]);

      toast({
        title: "Réponse reçue",
        description: "Bot.Bj a traité votre demande avec succès !",
      });

    } catch (error) {
      console.error('=== BOT.BJ WEBHOOK ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      
      let errorMessage = "Je rencontre des difficultés techniques. Laissez-moi vous proposer une assistance générale en attendant.";
      let toastMessage = "Problème de connexion";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "La requête a pris trop de temps. Le système Bot.Bj pourrait être occupé. Veuillez réessayer.";
          toastMessage = "Timeout - réessayez";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Impossible de se connecter au système Bot.Bj. Vérifiez votre connexion internet et réessayez.";
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
        title: "Bot.Bj - Problème technique",
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
