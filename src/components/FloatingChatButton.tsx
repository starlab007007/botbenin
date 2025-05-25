
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
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleToggleChat}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group relative overflow-hidden"
          size="icon"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 animate-pulse-glow" />
          {showChat ? (
            <X className="w-6 h-6 text-white transition-transform duration-300 group-hover:rotate-90 relative z-10" />
          ) : (
            <div className="relative z-10">
              <MessageCircle className="w-6 h-6 text-white" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-white animate-pulse" />
            </div>
          )}
        </Button>
        
        {/* Breathing animation ring */}
        {!showChat && (
          <div className="absolute inset-0 rounded-full bg-blue-600/30 animate-ping" />
        )}
      </div>

      {/* Chat Interface Modal */}
      {showChat && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm">
          <div className="fixed bottom-0 right-0 left-0 md:bottom-4 md:right-4 md:left-auto md:w-[420px] h-[80vh] md:h-[700px] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-gray-200">
            <ChatInterface onBackToLanding={() => setShowChat(false)} />
          </div>
        </div>
      )}
    </>
  );
};
