
import React, { useState } from 'react';
import { MessageCircle, X, Sparkles, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/ChatInterface';
import { useIsMobile } from '@/hooks/use-mobile';

type ChatWindowState = 'default' | 'maximized' | 'minimized';

export const FloatingChatButton: React.FC = () => {
  const [chatState, setChatState] = useState<ChatWindowState>('minimized');
  const isMobile = useIsMobile();

  // Gérer ouverture/fermeture
  const handleToggleChat = () => {
    setChatState(chatState === 'default' ? 'default' : 'default');
  };

  // Maximiser
  const handleMaximize = () => setChatState('maximized');
  // Rétablir taille normale
  const handleRestore = () => setChatState('default');
  // Minimiser
  const handleMinimize = () => setChatState('minimized');

  // Fermer depuis état plein écran ou normal (ramène à taille réduite)
  const handleClose = () => setChatState('minimized');

  // Icône flottante pour restaurer si réduit
  if (chatState === 'minimized') {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${isMobile ? 'mr-[2.5%]' : ''}`}>
        <Button
          onClick={handleRestore}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg hover:scale-110 transition-all"
          size="icon"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-white animate-pulse" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Modal Chat - taille normale ou plein écran */}
      {(chatState === 'default' || chatState === 'maximized') && (
        <div className={`fixed inset-0 z-40 ${chatState === 'default' ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/70 backdrop-blur'} transition-all`}>
          <div
            className={`fixed ${
              chatState === 'maximized'
                ? 'w-full h-full top-0 left-0 right-0 bottom-0 md:rounded-none'
                : isMobile
                  ? 'bottom-0 right-0 left-0 w-full h-[85vh] rounded-t-3xl'
                  : 'bottom-4 right-4 left-auto md:w-[420px] h-[85vh] md:h-[700px] rounded-t-3xl md:rounded-2xl'
            } bg-white shadow-2xl overflow-hidden animate-scale-in border border-gray-200 transition-all`}
            style={{
              zIndex: 60,
              ...(chatState === 'maximized'
                ? { top: 0, left: 0, right: 0, width: '100vw', height: '100vh', borderRadius: 0 }
                : isMobile 
                  ? { marginLeft: '2.5%', marginRight: '2.5%', width: '95%' }
                  : {})
            }}
          >
            {/* Custom header control buttons */}
            <div className="relative z-30 bg-transparent flex justify-end items-center p-1 pr-2 gap-1 h-10">
              {chatState !== 'maximized' && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Plein écran"
                  className="text-gray-600 hover:bg-gray-200"
                  onClick={handleMaximize}
                >
                  <Maximize className="w-5 h-5" />
                </Button>
              )}
              {chatState === 'maximized' && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Réduire la fenêtre"
                  className="text-gray-600 hover:bg-gray-200"
                  onClick={handleRestore}
                >
                  <Minimize className="w-5 h-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Réduire (minimiser)"
                className="text-gray-600 hover:bg-gray-200"
                onClick={handleMinimize}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            {/* Chat Interface */}
            <div className="h-[calc(100%-2.5rem)]">
              <ChatInterface onBackToLanding={handleMinimize} webhookUrl="https://bot.bj/bot/0484686a-34c8-4eeb-8974-90b079ee9fe2" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
