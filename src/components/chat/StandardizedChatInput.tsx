
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

  const handleSuggestionClick = (suggestion: string) => {
    setNewMessage(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="bg-white border-t border-gray-200">
      {/* Suggestions de messages centrées */}
      {showSuggestions && newMessage.trim() === '' && (
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Comment puis-je vous aider?
            </h3>
            <p className="text-gray-600 mb-6">
              Voici quelques suggestions pour commencer
            </p>
            <div className="space-y-3">
              {messageSuggestions.slice(0, 3).map((suggestion, index) => (
                <Button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  variant="outline"
                  size="lg"
                  className={`w-full text-left justify-start text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all ${
                    index === 0 ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600' : ''
                  }`}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
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
            placeholder="Tapez votre message ici..."
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
