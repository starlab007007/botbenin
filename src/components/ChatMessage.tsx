
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BookmarkPlus, BookmarkCheck, User, Bot } from 'lucide-react';
import { MediaRenderer } from '@/components/MediaRenderer';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isBookmarked?: boolean;
}

interface ChatMessageProps {
  message: Message;
  onToggleBookmark: (messageId: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onToggleBookmark }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(!message.isUser);

  useEffect(() => {
    if (message.isUser) {
      setDisplayedContent(message.content);
      setIsTyping(false);
      return;
    }

    // Smooth typing animation
    setDisplayedContent('');
    setIsTyping(true);
    
    let currentIndex = 0;
    const content = message.content;
    
    const typingTimer = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingTimer);
      }
    }, 20);

    return () => clearInterval(typingTimer);
  }, [message.content, message.isUser]);

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex items-start space-x-3 max-w-[80%] ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        {!message.isUser && (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center mt-1 shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
        )}

        {/* Message Content */}
        <div className="space-y-2 flex-1">
          {/* Bookmark button for AI messages */}
          {!message.isUser && (
            <div className="flex justify-end mb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleBookmark(message.id)}
                className={`h-8 w-8 p-0 rounded-xl transition-all duration-200 ${
                  message.isBookmarked 
                    ? 'text-gray-700 hover:text-gray-800 bg-gray-200 hover:bg-gray-300' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                {message.isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <BookmarkPlus className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}

          <div className={`rounded-2xl px-5 py-4 ${
            message.isUser 
              ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-br-lg shadow-lg' 
              : 'floating-card rounded-bl-lg bg-gray-50'
          }`}>
            <div className="text-sm leading-relaxed">
              {isTyping ? (
                <div className="whitespace-pre-wrap">
                  {displayedContent}
                  <span className="inline-block w-1 h-4 bg-gray-400 ml-1 animate-pulse rounded"></span>
                </div>
              ) : (
                <MediaRenderer content={displayedContent} />
              )}
            </div>
          </div>

          {/* Timestamp for AI messages */}
          {!message.isUser && !isTyping && (
            <div className="flex items-center justify-end px-2">
              <span className="text-xs text-gray-500 font-medium">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
