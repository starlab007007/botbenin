
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Smile, Send, Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { HybridSuggestionSystem } from '@/components/HybridSuggestionSystem';

interface StandardizedChatInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
  isTyping: boolean;
  botId?: string;
  userContext?: 'business' | 'marketing' | 'gestion' | 'citoyen' | 'services_locaux' | 'restaurant' | 'automation' | 'general';
}

export const StandardizedChatInput: React.FC<StandardizedChatInputProps> = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  isTyping,
  botId,
  userContext = 'general'
}) => {
  const [showSuggestions, setShowSuggestions] = useState(true);
  const isMobile = useIsMobile();

  const messageSuggestions = [
    "Quoi de neuf aujourd'hui",
    "Les bons plans de la journée",
    "Qu'est-ce que vous m'offrez",
    "Comment puis-je vous aider ?",
    "Avez-vous des recommandations ?",
    "Parlez-moi de vos services"
  ];

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleSuggestionClick = (action: string) => {
    setNewMessage(action);
    setShowSuggestions(false);
    // Auto-send the suggestion
    setTimeout(() => {
      if (action.trim()) {
        onSendMessage();
      }
    }, 100);
  };

  return (
    <div className="bg-white border-t border-gray-200">
      {/* Intelligent Suggestions */}
      {showSuggestions && newMessage.trim() === '' && (
        <div className={`${isMobile ? 'p-4' : 'p-6'} border-b border-gray-100 bg-gray-50`}>
          <HybridSuggestionSystem
            botId={botId}
            userContext={userContext}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>
      )}

      {/* Zone de saisie */}
      <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
        <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-2'}`}>
          <Button 
            variant="outline" 
            size="sm" 
            className={`text-gray-700 border-gray-300 hover:bg-gray-50 ${isMobile ? 'p-2' : ''}`}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className={`text-gray-700 border-gray-300 hover:bg-gray-50 ${isMobile ? 'p-2' : ''}`}
          >
            <Smile className="w-4 h-4" />
          </Button>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tapez votre message ici..."
            className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white resize-none ${
              isMobile ? 'text-base min-h-[44px]' : 'min-h-[40px]'
            }`}
            disabled={isTyping}
            maxLength={4000}
            rows={1}
            style={{ maxHeight: isMobile ? '100px' : '120px' }}
          />
          <Button 
            onClick={onSendMessage} 
            className={`bg-blue-600 hover:bg-blue-700 text-white ${isMobile ? 'p-3' : ''}`}
            disabled={isTyping || !newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Indicateur de statut */}
        <div className={`flex items-center justify-between mt-2 ${isMobile ? 'text-xs' : 'text-xs'} text-gray-500`}>
          <span className={isMobile ? 'text-xs' : ''}>
            Chat public disponible pour tous • Assistance IA 24/7
          </span>
          <span>{newMessage.length}/4000</span>
        </div>
      </div>
    </div>
  );
};
