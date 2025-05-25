
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Paperclip, Mic } from 'lucide-react';

interface ChatInputAreaProps {
  inputValue: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onSendMessage: () => void;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  inputValue,
  isLoading,
  onInputChange,
  onKeyPress,
  onSendMessage,
}) => {
  return (
    <div className="bg-white border-t border-gray-100 p-4">
      <div className="flex items-end space-x-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg h-8 w-8 p-0 mb-1"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        
        <div className="flex-1 relative">
          <Input
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Tapez votre message..."
            className="flex-1 border-gray-200 focus:border-blue-500 bg-gray-50 text-gray-900 placeholder-gray-500 rounded-2xl py-3 px-4 pr-12 transition-all duration-200"
            disabled={isLoading}
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg h-8 w-8 p-0"
          >
            <Mic className="w-4 h-4" />
          </Button>
        </div>
        
        <Button
          onClick={onSendMessage}
          disabled={!inputValue.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-10 w-10 p-0 shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
