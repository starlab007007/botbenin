
import React, { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { SuggestionCards } from './SuggestionCards';

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
  userContext: 'business' | 'marketing' | 'gestion' | 'citoyen' | 'services_locaux' | 'restaurant' | 'automation' | 'general';
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
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
      <div className="max-w-4xl mx-auto">
        {messages.map((message, index) => {
          // Désactiver l'animation pour tous les messages existants sauf le dernier message du bot
          const isLastBotMessage = !message.isUser && 
                                  index === messages.length - 1 && 
                                  messages.length > 1;
          const disableAnimation = !isLastBotMessage;
          
          return (
            <ChatMessage
              key={message.id}
              message={message}
              onToggleBookmark={onToggleBookmark}
              disableTypingAnimation={disableAnimation}
            />
          );
        })}
        
        {showSuggestions && (
          <SuggestionCards
            userContext={userContext}
            onSuggestionClick={onSuggestionClick}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
