
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Smile, Send, Sparkles } from 'lucide-react';

interface StandardizedChatInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
  isTyping: boolean;
}

export const StandardizedChatInput: React.FC<StandardizedChatInputProps> = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  isTyping
}) => {
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messageSuggestions = [
    "Bonjour, comment allez-vous ?",
    "Pouvez-vous m'aider avec...",
    "J'aimerais en savoir plus sur...",
    "Quels sont vos services ?",
    "Comment puis-je commencer ?",
    "Avez-vous des recommandations ?"
  ];

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setNewMessage(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="bg-white border-t border-gray-200">
      {/* Suggestions de messages */}
      {showSuggestions && newMessage.trim() === '' && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">Suggestions de messages</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {messageSuggestions.slice(0, 3).map((suggestion, index) => (
              <Button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                variant="outline"
                size="sm"
                className="text-xs text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Zone de saisie */}
      <div className="p-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="text-gray-700 border-gray-300 hover:bg-gray-50">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="text-gray-700 border-gray-300 hover:bg-gray-50">
            <Smile className="w-4 h-4" />
          </Button>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tapez votre message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white resize-none"
            disabled={isTyping}
            maxLength={4000}
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <Button 
            onClick={onSendMessage} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isTyping || !newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Indicateur de statut */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Chat public disponible pour tous • Assistance IA 24/7</span>
          <span>{newMessage.length}/4000</span>
        </div>
      </div>
    </div>
  );
};
