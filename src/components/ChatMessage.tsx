
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
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

    // iPhone-style smooth typing animation
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
    }, 20); // Smooth typing speed

    return () => clearInterval(typingTimer);
  }, [message.content, message.isUser]);

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-slide-in mb-4`}>
      <div className={`flex items-start space-x-3 max-w-[85%] ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Modern avatar with gradient */}
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-semibold shadow-lg ${
          message.isUser 
            ? 'bg-gradient-to-r from-primary to-primary/80' 
            : 'bg-gradient-to-r from-secondary to-accent'
        }`}>
          {message.isUser ? (
            <User className="w-5 h-5" />
          ) : (
            <Bot className="w-5 h-5 text-foreground" />
          )}
        </div>

        {/* Message Content */}
        <div className="space-y-2 flex-1">
          <div className={`${message.isUser ? 'chat-bubble-user' : 'chat-bubble-ai'} transition-all duration-300 hover:shadow-lg`}>
            <div className="text-sm leading-relaxed">
              {isTyping ? (
                <div className="whitespace-pre-wrap">
                  {displayedContent}
                  <span className="inline-block w-1 h-4 bg-primary ml-1 animate-pulse rounded"></span>
                </div>
              ) : (
                <MediaRenderer content={displayedContent} />
              )}
            </div>
          </div>

          {/* Action Buttons for AI Messages */}
          {!message.isUser && !isTyping && (
            <div className="flex items-center space-x-3 px-2 animate-fade-in">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleBookmark(message.id)}
                className={`text-xs h-8 rounded-xl transition-all duration-300 ${
                  message.isBookmarked 
                    ? 'text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {message.isBookmarked ? (
                  <BookmarkCheck className="w-3 h-3 mr-1" />
                ) : (
                  <BookmarkPlus className="w-3 h-3 mr-1" />
                )}
                {message.isBookmarked ? 'Sauvé' : 'Sauvegarder'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
