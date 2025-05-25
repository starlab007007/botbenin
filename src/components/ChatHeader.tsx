
import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Sparkles } from 'lucide-react';

interface ChatHeaderProps {
  onBackToLanding: () => void;
  isLoading: boolean;
  bookmarkedCount: number;
  onShowBookmarks: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onBackToLanding,
  isLoading,
  bookmarkedCount,
  onShowBookmarks,
}) => {
  return (
    <div className="gradient-glass border-b border-white/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToLanding}
            className="text-gray-300 hover:text-white hover:bg-white/10 rounded-xl"
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">Bot.Bj</h1>
              <p className="text-xs text-gray-400">Assistant IA Intelligent</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full transition-colors ${isLoading ? 'bg-yellow-400 glow-animation' : 'bg-green-400'}`} />
          <Button
            variant="outline"
            size="sm"
            onClick={onShowBookmarks}
            className="border-white/20 text-gray-300 text-xs hover:bg-white/10 rounded-xl"
          >
            Favoris ({bookmarkedCount})
          </Button>
        </div>
      </div>
    </div>
  );
};
