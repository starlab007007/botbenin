
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

  // Générer des suggestions dynamiques basées sur le dernier message de l'IA
  const generateDynamicSuggestions = (lastBotMessage: string) => {
    const suggestions = [
      { action: "Pouvez-vous me donner plus de détails ?" },
      { action: "Quelles sont les options disponibles ?" },
      { action: "Comment puis-je procéder ?" }
    ];

    // Suggestions spécifiques basées sur le contenu
    if (lastBotMessage.toLowerCase().includes('iphone') || lastBotMessage.toLowerCase().includes('coque')) {
      return [
        { action: "Montrez-moi les coques iPhone 15" },
        { action: "Quels sont vos prix ?" },
        { action: "Avez-vous des promotions ?" }
      ];
    }
    
    if (lastBotMessage.toLowerCase().includes('boutique') || lastBotMessage.toLowerCase().includes('article')) {
      return [
        { action: "Voir tous les produits" },
        { action: "Quelles sont vos marques ?" },
        { action: "Livraison disponible ?" }
      ];
    }

    if (lastBotMessage.toLowerCase().includes('nouveauté')) {
      return [
        { action: "Voir les dernières arrivées" },
        { action: "Quand sortent les nouveaux modèles ?" },
        { action: "Newsletter pour les nouveautés" }
      ];
    }

    return suggestions;
  };

  const lastBotMessage = messages.slice().reverse().find(msg => !msg.isUser);
  const showDynamicSuggestions = messages.length > 1 && lastBotMessage && !isLoading;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
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
            
            {/* Suggestion buttons - Modifiées */}
            <div className="space-y-3 max-w-sm mx-auto">
              <button 
                onClick={() => onSuggestionClick({ action: "Je cherche une coque d'iPhone" })}
                className="w-full bg-blue-600 text-white rounded-2xl py-4 px-6 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Je cherche une coque d'iPhone
              </button>
              <button 
                onClick={() => onSuggestionClick({ action: "Quels sont les articles disponibles dans votre boutique ?" })}
                className="w-full bg-white border border-gray-200 text-gray-700 rounded-2xl py-4 px-6 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Quels sont les articles disponibles dans votre boutique ?
              </button>
              <button 
                onClick={() => onSuggestionClick({ action: "Quelles sont les nouveautés ?" })}
                className="w-full bg-white border border-gray-200 text-gray-700 rounded-2xl py-4 px-6 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Quelles sont les nouveautés ?
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

        {/* Suggestions dynamiques après chaque réponse */}
        {showDynamicSuggestions && (
          <div className="flex flex-col items-center mt-6">
            <p className="text-sm text-gray-500 mb-3">Suggestions :</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {generateDynamicSuggestions(lastBotMessage.content).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSuggestionClick(suggestion)}
                  className="bg-white border border-gray-200 text-gray-700 rounded-full py-2 px-4 text-xs font-medium hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                >
                  {suggestion.action}
                </button>
              ))}
            </div>
          </div>
        )}

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
