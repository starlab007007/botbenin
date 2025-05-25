import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from '@/components/ChatMessage';
import { BookmarkedAdvice } from '@/components/BookmarkedAdvice';
import { SuggestionCards } from '@/components/SuggestionCards';
import { ArrowLeft, X, Send, Sparkles } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      {/* Modern Header */}
      <div className="gradient-glass border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToLanding}
              className="text-gray-300 hover:text-white hover:bg-white/10 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white">Bot.Bj</h1>
                <p className="text-xs text-gray-400">Assistant IA Intelligent</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full transition-colors ${isLoading ? 'bg-yellow-400 glow-animation' : 'bg-green-400'}`} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBookmarks(true)}
              className="border-white/20 text-gray-300 text-xs hover:bg-white/10 rounded-xl"
            >
              Favoris ({bookmarkedMessages.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Dynamic Suggestions */}
          {showSuggestions && messages.length === 1 && (
            <div className="mb-8">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Suggestions personnalisées
                </h3>
                <p className="text-gray-400 text-sm">
                  Démarrez rapidement avec ces actions recommandées
                </p>
              </div>
              <SuggestionCards 
                userContext={getUserContext()}
                onSuggestionClick={handleSuggestionClick}
              />
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onToggleBookmark={toggleBookmark}
            />
          ))}

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-start">
              <Card className="chat-bubble-ai p-4">
                <div className="flex items-center space-x-3">
                  <div className="typing-dots">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                  <span className="text-sm text-gray-300">Bot.Bj réfléchit...</span>
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Modern Input Area */}
      <div className="gradient-glass border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Décrivez ce que vous souhaitez accomplir..."
                className="flex-1 border-white/20 focus:border-blue-400 bg-white/5 text-white placeholder-gray-400 rounded-xl py-3 px-4 backdrop-blur-sm"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Bot.Bj peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </div>
  );
};
