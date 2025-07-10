
import React, { useCallback, useRef } from 'react';
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
  const isProcessingRef = useRef(false);

  // Optimisation du bouton d'envoi avec protection contre les double-clics
  const handleSendClick = useCallback(() => {
    console.log('=== SEND BUTTON CLICKED ===');
    console.log('Input value:', inputValue);
    console.log('Is loading:', isLoading);
    console.log('Is processing:', isProcessingRef.current);
    
    // Vérifications strictes pour éviter les envois multiples
    if (isProcessingRef.current) {
      console.log('Already processing, ignoring click');
      return;
    }
    
    if (!inputValue.trim()) {
      console.log('Empty message, not sending');
      return;
    }
    
    if (isLoading) {
      console.log('Already loading, not sending');
      return;
    }

    // Marquer comme en cours de traitement
    isProcessingRef.current = true;
    console.log('Sending message immediately...');
    
    try {
      onSendMessage();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      // Réinitialiser après un court délai pour éviter les clics rapides
      setTimeout(() => {
        isProcessingRef.current = false;
        console.log('Send processing reset');
      }, 1000);
    }
  }, [inputValue, isLoading, onSendMessage]);

  // Gestion optimisée des touches clavier
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('Enter key pressed, attempting to send...');
      
      // Même logique de protection que pour le clic
      if (isProcessingRef.current || isLoading || !inputValue.trim()) {
        console.log('Cannot send via Enter key');
        return;
      }
      
      handleSendClick();
    }
    
    // Appeler la fonction originale pour d'autres traitements
    onKeyPress(e);
  }, [handleSendClick, onKeyPress, inputValue, isLoading]);

  // Déterminer si le bouton doit être désactivé
  const isButtonDisabled = !inputValue.trim() || isLoading || isProcessingRef.current;

  return (
    <div className={`border-t border-gray-200 bg-white ${isMobile ? 'px-[5%] py-4' : 'px-[5%] md:px-6 py-6'}`}>
      <div className="max-w-full mx-auto">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
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
                  <span className="text-sm text-gray-600 font-medium">Envoi en cours...</span>
                </div>
              </div>
            )}
          </div>
          
          <Button
            onClick={handleSendClick}
            disabled={isButtonDisabled}
            className={`${
              isMobile ? 'h-12 w-12' : 'h-14 w-14'
            } rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 active:scale-95`}
            type="button"
          >
            {isLoading || isProcessingRef.current ? (
              <Loader2 className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} animate-spin text-white`} />
            ) : (
              <Send className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
            )}
          </Button>
        </div>
        
        {/* Indicateur de statut amélioré */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>
            {isProcessingRef.current ? 'Envoi en cours...' : 
             isLoading ? 'Traitement...' : 
             'Appuyez sur Entrée ou cliquez pour envoyer'}
          </span>
          <span className={inputValue.length > 4000 ? 'text-red-500' : ''}>
            {inputValue.length}/4000
          </span>
        </div>
      </div>
    </div>
  );
};
