
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

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
    <div className="gradient-glass border-t border-white/10 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder="Décrivez ce que vous souhaitez accomplir..."
              className="flex-1 border-white/20 focus:border-blue-400 bg-white/5 text-white placeholder-gray-400 rounded-xl py-3 px-4 backdrop-blur-sm"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={onSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Bot.Bj peut faire des erreurs. Vérifiez les informations importantes.
        </p>
      </div>
    </div>
  );
};
