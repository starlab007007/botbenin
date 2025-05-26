
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
    <div className="glass-header p-6 bg-gray-50">
      <div className="flex items-end space-x-4 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className="modern-button-secondary h-12 w-12 p-0 mb-1"
        >
          <Paperclip className="w-5 h-5 text-gray-600" />
        </Button>
        
        <div className="flex-1 relative">
          <Textarea
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Tapez votre message..."
            className="modern-input min-h-[60px] max-h-[120px] resize-none py-4 px-6 pr-14 text-base bg-gray-50/90 backdrop-blur-sm border-gray-200/50"
            disabled={isLoading}
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 bottom-3 modern-button-secondary h-10 w-10 p-0"
          >
            <Mic className="w-5 h-5 text-gray-500" />
          </Button>
        </div>
        
        <Button
          onClick={onSendMessage}
          disabled={!inputValue.trim() || isLoading}
          className="modern-button-primary h-12 w-12 p-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 mb-1"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
};
