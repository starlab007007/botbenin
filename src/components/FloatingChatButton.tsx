
import React, { useState } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/ChatInterface';

export const FloatingChatButton: React.FC = () => {
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      {/* iPhone 16 style floating chat button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowChat(!showChat)}
          className="button-primary w-16 h-16 rounded-2xl shadow-2xl hover:shadow-xl transition-all duration-300 hover:scale-110 group relative overflow-hidden"
          size="icon"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 animate-pulse" />
          {showChat ? (
            <X className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90 relative z-10" />
          ) : (
            <div className="relative z-10">
              <MessageCircle className="w-6 h-6" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-white animate-pulse" />
            </div>
          )}
        </Button>
        
        {/* Breathing animation ring */}
        {!showChat && (
          <div className="absolute inset-0 rounded-2xl bg-primary/30 animate-ping" />
        )}
      </div>

      {/* Modern Chat Interface Modal - iPhone 16 style */}
      {showChat && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md">
          <div className="fixed bottom-4 right-4 left-4 md:bottom-6 md:right-6 md:left-auto md:w-[420px] h-[70vh] md:h-[680px] glass-morphism rounded-3xl overflow-hidden border border-border/20 shadow-2xl animate-scale-in">
            <ChatInterface onBackToLanding={() => setShowChat(false)} />
          </div>
        </div>
      )}
    </>
  );
};
