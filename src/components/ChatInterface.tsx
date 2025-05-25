
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from '@/components/ChatMessage';
import { BookmarkedAdvice } from '@/components/BookmarkedAdvice';
import { ArrowLeft } from 'lucide-react';

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm your AI career coach. I'm here to help you discover your purpose and build your dream career. What would you like to explore today?",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      console.log('Sending message to webhook:', inputValue);
      
      const response = await fetch('https://ia.bot.bj/webhook/iphoneshop1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          timestamp: new Date().toISOString(),
          session_id: 'career_coaching_session'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();
      console.log('Received response from webhook:', data);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data || "I'm here to help you with your career journey. Could you tell me more about what you're looking to achieve?",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error calling webhook:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble connecting right now. In the meantime, I'd love to help you think through your career goals. What specific area would you like to focus on - skill development, career transition, or finding your next opportunity?",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Connection Issue",
        description: "Having trouble connecting to the AI coach. Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-warm-beige-50 to-soft-peach-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-warm-beige-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToLanding}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="font-playfair font-semibold text-xl text-gray-900">CareerCoach AI</h1>
              <p className="text-sm text-gray-600">Your personal career guidance</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBookmarks(true)}
            className="border-soft-peach-200 text-soft-peach-700 hover:bg-soft-peach-50"
          >
            Saved Advice ({bookmarkedMessages.length})
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onToggleBookmark={toggleBookmark}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <Card className="chat-bubble chat-bubble-ai">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-soft-peach-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-soft-peach-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-soft-peach-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-warm-beige-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your career goals, skills, or industry interests..."
              className="flex-1 border-warm-beige-300 focus:border-soft-peach-400 focus:ring-soft-peach-400/20 rounded-full px-4 py-3"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-soft-peach-500 hover:bg-soft-peach-600 text-white rounded-full px-6 py-3 disabled:opacity-50"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
