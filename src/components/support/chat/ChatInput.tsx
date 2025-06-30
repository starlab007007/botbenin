
import React from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Smile, Send } from 'lucide-react';

interface ChatInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
  isTyping: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  isTyping
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSendMessage();
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
          <Paperclip className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
          <Smile className="w-4 h-4" />
        </Button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Tapez votre message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          disabled={isTyping}
          maxLength={4000}
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
        <span>Chat public disponible pour tous</span>
        <span>{newMessage.length}/4000</span>
      </div>
    </div>
  );
};
