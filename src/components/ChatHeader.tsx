
import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Bot, Bookmark } from 'lucide-react';

interface ChatHeaderProps {
  onBackToLanding: () => void;
  isLoading: boolean;
  bookmarkedCount: number;
  onShowBookmarks: () => void;
  title?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onBackToLanding,
  isLoading,
  bookmarkedCount,
  onShowBookmarks,
  title = 'Bot.Bj Assistant',
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-lg">{title}</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full transition-colors ${isLoading ? 'bg-yellow-300 animate-pulse' : 'bg-green-300'}`} />
            <span className="text-sm text-white/80">{isLoading ? 'En cours...' : 'En ligne'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {bookmarkedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowBookmarks}
            className="text-white hover:bg-white/20 rounded-lg h-10 w-10 p-0 relative"
          >
            <Bookmark className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {bookmarkedCount}
            </span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToLanding}
          className="text-white hover:bg-white/20 rounded-lg h-10 w-10 p-0"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
