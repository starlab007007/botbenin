
import React, { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ChatMessage } from '@/components/ChatMessage';
import { SuggestionCards } from '@/components/SuggestionCards';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isBookmarked?: boolean;
}

interface ChatMessageAreaProps {
  messages: Message[];
  showSuggestions: boolean;
  userContext: 'business' | 'marketing' | 'gestion' | 'citoyen' | 'general';
  isLoading: boolean;
  onToggleBookmark: (messageId: string) => void;
  onSuggestionClick: (suggestion: any) => void;
}

export const ChatMessageArea: React.FC<ChatMessageAreaProps> = ({
  messages,
  showSuggestions,
  userContext,
  isLoading,
  onToggleBookmark,
  onSuggestionClick,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
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
              userContext={userContext}
              onSuggestionClick={onSuggestionClick}
            />
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onToggleBookmark={onToggleBookmark}
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
  );
};
