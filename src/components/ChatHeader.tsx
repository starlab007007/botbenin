
import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Menu } from 'lucide-react';

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
    <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg h-8 w-8 p-0"
        >
          <Menu className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="font-semibold text-lg text-gray-900">Votre Assistant</h1>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full transition-colors ${isLoading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToLanding}
          className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
