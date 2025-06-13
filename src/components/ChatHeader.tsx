
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bookmark, MessageSquare, User, UserCheck } from 'lucide-react';

interface ChatHeaderProps {
  onBackToLanding: () => void;
  isLoading: boolean;
  bookmarkedCount: number;
  onShowBookmarks: () => void;
  title?: string;
  isVisitorMode?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  onBackToLanding, 
  isLoading, 
  bookmarkedCount, 
  onShowBookmarks, 
  title = 'Assistant IA',
  isVisitorMode = false
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-white/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToLanding}
          className="text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {isVisitorMode ? (
                <>
                  <UserCheck className="w-3 h-3 text-green-500" />
                  <span className="text-green-600">Mode Visiteur</span>
                </>
              ) : (
                <>
                  <User className="w-3 h-3" />
                  <span>Utilisateur</span>
                </>
              )}
              {isLoading && (
                <span className="ml-2 text-blue-500">• Réflexion...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {bookmarkedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowBookmarks}
            className="text-gray-600 hover:text-gray-800 relative"
          >
            <Bookmark className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {bookmarkedCount}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
};
