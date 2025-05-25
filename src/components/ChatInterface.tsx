
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
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    console.log('=== WEBHOOK DEBUG START ===');
    console.log('User message:', currentInput);
    console.log('Webhook URL:', 'https://ia.bot.bj/webhook/iphoneshop1');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout after 30 seconds');
        controller.abort();
      }, 30000);

      const requestPayload = {
        message: currentInput,
        timestamp: new Date().toISOString(),
        session_id: 'career_coaching_session',
        user_id: 'anonymous_user',
        source: 'career_coaching_app'
      };

      console.log('Request payload:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch('https://ia.bot.bj/webhook/iphoneshop1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'CareerCoach-App/1.0',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        mode: 'cors', // Try CORS first
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
        
        // Try different possible response structures
        processedContent = responseData.message || 
                          responseData.response || 
                          responseData.text || 
                          responseData.content ||
                          responseData.reply ||
                          responseData.output ||
                          (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
      } else {
        responseData = await response.text();
        console.log('Text Response:', responseData);
        processedContent = responseData;
      }

      console.log('Processed content:', processedContent);

      if (!processedContent || processedContent.trim() === '') {
        throw new Error('Empty or invalid response from n8n webhook');
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
        title: "Response Received",
        description: "Successfully connected to n8n and received AI response!",
      });

    } catch (error) {
      console.error('=== WEBHOOK ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      
      let errorMessage = "I'm having trouble connecting to the AI service right now. Let me help you with some general career guidance instead.";
      let toastMessage = "Connection failed";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "The request to n8n timed out after 30 seconds. This might indicate the webhook is not responding. Please check your n8n workflow.";
          toastMessage = "Request timeout - check n8n workflow";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Cannot reach the n8n webhook. This could be due to:\n• CORS issues\n• Network connectivity problems\n• The webhook URL being incorrect\n• n8n workflow not active";
          toastMessage = "Cannot reach n8n webhook - check CORS and workflow status";
        } else if (error.message.includes('HTTP')) {
          errorMessage = `n8n webhook returned an error: ${error.message}. Please check your n8n workflow configuration.`;
          toastMessage = `n8n error: ${error.message}`;
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
        title: "n8n Connection Issue",
        description: toastMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('=== WEBHOOK DEBUG END ===');
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
              <p className="text-sm text-gray-600">Powered by n8n webhook integration</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-green-500'}`} 
                 title={isLoading ? 'Connecting to n8n...' : 'Ready to connect'} />
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
                  <span className="text-sm text-gray-600">Connecting to n8n...</span>
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
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
