
import React, { useState } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/ChatInterface';

export const FloatingChatButton: React.FC = () => {
  const [showChat, setShowChat] = useState(false);

  const handleToggleChat = () => {
    setShowChat(!showChat);
  };

  return (
    <>
      {/* Floating chat button */}
      <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-50">
        <Button
          onClick={handleToggleChat}
          className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group relative overflow-hidden"
          size="icon"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-gray-500/20 animate-pulse" />
          {showChat ? (
            <X className="w-5 h-5 lg:w-6 lg:h-6 text-white transition-transform duration-300 group-hover:rotate-90 relative z-10" />
          ) : (
            <div className="relative z-10">
              <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-white animate-pulse" />
            </div>
          )}
        </Button>
        
        {/* Breathing animation ring */}
        {!showChat && (
          <div className="absolute inset-0 rounded-full bg-gray-500/30 animate-ping" />
        )}
      </div>

      {/* Chat Interface Modal */}
      {showChat && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm">
          <div className="fixed bottom-0 right-0 left-0 md:bottom-4 md:right-4 md:left-auto md:w-[420px] h-[85vh] md:h-[700px] bg-gray-50 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-gray-200">
            <ChatInterface onBackToLanding={() => setShowChat(false)} />
          </div>
        </div>
      )}
    </>
  );
};
