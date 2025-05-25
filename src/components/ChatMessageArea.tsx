
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
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
      <div className="max-w-full mx-auto space-y-4">
        {/* Welcome message and suggestions */}
        {messages.length <= 1 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-semibold text-lg">🤖</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Comment puis-je vous aider?
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              Voici quelques suggestions pour commencer
            </p>
            
            {/* Suggestion buttons */}
            <div className="space-y-2 max-w-xs mx-auto">
              <button 
                onClick={() => onSuggestionClick({ action: "Comment optimiser ma productivité?" })}
                className="w-full bg-blue-600 text-white rounded-2xl py-3 px-4 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Comment optimiser ma productivité?
              </button>
              <button 
                onClick={() => onSuggestionClick({ action: "Quelles sont vos objectifs?" })}
                className="w-full bg-white border border-gray-200 text-gray-700 rounded-2xl py-3 px-4 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Quelles sont vos objectifs?
              </button>
              <button 
                onClick={() => onSuggestionClick({ action: "Comment puis-je vous aider?" })}
                className="w-full bg-white border border-gray-200 text-gray-700 rounded-2xl py-3 px-4 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Comment puis-je vous aider?
              </button>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.slice(1).map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onToggleBookmark={onToggleBookmark}
          />
        ))}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-lg p-4 shadow-sm border border-gray-100 max-w-xs">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500">En train d'écrire...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
