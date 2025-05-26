
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
    <div className="glass-header p-4 flex items-center justify-between bg-gray-50">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl flex items-center justify-center shadow-lg">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-lg text-gray-900 font-display">{title}</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isLoading 
                ? 'bg-gray-400 animate-pulse shadow-sm' 
                : 'bg-gray-500 shadow-sm'
            }`} />
            <span className="text-sm text-gray-600 font-medium">
              {isLoading ? 'En cours...' : 'En ligne'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {bookmarkedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowBookmarks}
            className="modern-button-secondary h-10 w-10 p-0 relative"
          >
            <Bookmark className="w-5 h-5 text-gray-600" />
            <span className="absolute -top-1 -right-1 bg-gray-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium shadow-sm">
              {bookmarkedCount}
            </span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToLanding}
          className="modern-button-secondary h-10 w-10 p-0 hover:bg-gray-100 hover:text-gray-800"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
