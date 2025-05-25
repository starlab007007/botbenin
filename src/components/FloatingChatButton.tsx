
import React, { useState } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/ChatInterface';

export const FloatingChatButton: React.FC = () => {
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      {/* Ultra-Modern Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowChat(!showChat)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl w-16 h-16 shadow-2xl hover:shadow-blue-500/25 transition-all duration-500 hover:scale-110 glow-animation group"
          size="icon"
        >
          {showChat ? (
            <X className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90" />
          ) : (
            <div className="relative">
              <MessageCircle className="w-6 h-6" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
            </div>
          )}
        </Button>
        
        {/* Pulse Ring Animation */}
        {!showChat && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 animate-ping opacity-20"></div>
        )}
      </div>

      {/* Modern Chat Interface Modal */}
      {showChat && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md">
          <div className="fixed bottom-4 right-4 left-4 md:bottom-6 md:right-6 md:left-auto md:w-[420px] h-[70vh] md:h-[680px] gradient-glass rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <ChatInterface onBackToLanding={() => setShowChat(false)} />
          </div>
        </div>
      )}
    </>
  );
};
