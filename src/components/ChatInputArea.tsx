
import React from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputAreaProps {
  inputValue: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onSendMessage: () => void;
}

// Utilitaire pour détecter les appareils mobiles
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  inputValue,
  isLoading,
  onInputChange,
  onKeyPress,
  onSendMessage,
}) => {
  const isMobile = isMobileDevice();

  return (
    <div className={`border-t border-gray-200 bg-white ${isMobile ? 'px-[5%] py-4' : 'px-[5%] md:px-6 py-6'}`}>
      <div className="max-w-full mx-auto">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder="Tapez votre message ici..."
              disabled={isLoading}
              rows={isMobile ? 2 : 3}
              className={`w-full resize-none rounded-2xl border-2 border-gray-200 ${
                isMobile ? 'px-4 py-3 text-base' : 'px-5 py-4 text-lg'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md font-medium leading-relaxed`}
              style={{ 
                minHeight: isMobile ? '48px' : '60px',
                maxHeight: isMobile ? '120px' : '150px'
              }}
            />
            {isLoading && (
              <div className="absolute inset-0 bg-gray-50 bg-opacity-75 rounded-2xl flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600 font-medium">Traitement...</span>
                </div>
              </div>
            )}
          </div>
          
          <Button
            onClick={onSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={`${
              isMobile ? 'h-12 w-12' : 'h-14 w-14'
            } rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100`}
          >
            {isLoading ? (
              <Loader2 className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} animate-spin text-white`} />
            ) : (
              <Send className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
