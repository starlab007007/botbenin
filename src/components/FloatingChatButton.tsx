import React from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export const FloatingChatButton: React.FC = () => {
  const isMobile = useIsMobile();
  const webhookUrl = "https://bot.bj/bot/770c2547-db60-41ab-9f18-1f080fa7ebbb";

  const handleClick = () => {
    window.open(webhookUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${isMobile ? 'mr-[2.5%]' : ''}`}>
      <Button
        onClick={handleClick}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg hover:scale-110 transition-all"
        size="icon"
        aria-label="Discuter avec l'IA"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-white animate-pulse" />
      </Button>
    </div>
  );
};
