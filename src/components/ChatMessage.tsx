
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
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-end space-x-2 max-w-[80%] ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        {!message.isUser && (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mb-1">
            <Bot className="w-4 h-4 text-gray-600" />
          </div>
        )}

        {/* Message Content */}
        <div className="space-y-1">
          <div className={`rounded-2xl px-4 py-3 ${
            message.isUser 
              ? 'bg-blue-600 text-white rounded-br-lg' 
              : 'bg-white text-gray-900 rounded-bl-lg shadow-sm border border-gray-100'
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

          {/* Timestamp and actions for AI messages */}
          {!message.isUser && !isTyping && (
            <div className="flex items-center space-x-2 px-2">
              <span className="text-xs text-gray-500">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleBookmark(message.id)}
                className={`text-xs h-6 px-2 rounded-lg transition-all duration-200 ${
                  message.isBookmarked 
                    ? 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {message.isBookmarked ? (
                  <BookmarkCheck className="w-3 h-3" />
                ) : (
                  <BookmarkPlus className="w-3 h-3" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
