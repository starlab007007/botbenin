
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookmarkPlus, BookmarkCheck } from 'lucide-react';

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

    // Typing animation for AI messages
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
    }, 30);

    return () => clearInterval(typingTimer);
  }, [message.content, message.isUser]);

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div className={`flex items-start space-x-3 max-w-[80%] ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
          message.isUser ? 'bg-soft-peach-500' : 'bg-warm-beige-500'
        }`}>
          {message.isUser ? 'U' : 'AI'}
        </div>

        {/* Message Content */}
        <div className="space-y-2">
          <Card className={`chat-bubble ${message.isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {displayedContent}
              {isTyping && <span className="animate-pulse">|</span>}
            </div>
          </Card>

          {/* Bookmark Button for AI messages */}
          {!message.isUser && !isTyping && (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleBookmark(message.id)}
                className={`text-xs ${
                  message.isBookmarked 
                    ? 'text-soft-peach-600 hover:text-soft-peach-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {message.isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4 mr-1" />
                ) : (
                  <BookmarkPlus className="w-4 h-4 mr-1" />
                )}
                {message.isBookmarked ? 'Saved' : 'Save'}
              </Button>
              <span className="text-xs text-gray-400">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
