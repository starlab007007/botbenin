
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

    // Modern typing animation for AI messages
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
    }, 25); // Faster typing for modern feel

    return () => clearInterval(typingTimer);
  }, [message.content, message.isUser]);

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`flex items-start space-x-4 max-w-[85%] ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Modern Avatar */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg ${
          message.isUser 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600' 
            : 'bg-gradient-to-r from-slate-700 to-slate-600'
        }`}>
          {message.isUser ? (
            <User className="w-5 h-5" />
          ) : (
            <Bot className="w-5 h-5" />
          )}
        </div>

        {/* Message Content */}
        <div className="space-y-2 flex-1">
          <Card className={`chat-bubble ${message.isUser ? 'chat-bubble-user' : 'chat-bubble-ai'} transition-all duration-300 hover:shadow-xl`}>
            <div className="text-sm leading-relaxed">
              {isTyping ? (
                <div className="whitespace-pre-wrap">
                  {displayedContent}
                  <span className="inline-block w-2 h-5 bg-blue-400 ml-1 animate-pulse"></span>
                </div>
              ) : (
                <MediaRenderer content={displayedContent} />
              )}
            </div>
          </Card>

          {/* Action Buttons for AI Messages */}
          {!message.isUser && !isTyping && (
            <div className="flex items-center space-x-3 px-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleBookmark(message.id)}
                className={`text-xs h-8 rounded-lg transition-all duration-300 ${
                  message.isBookmarked 
                    ? 'text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20' 
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                {message.isBookmarked ? (
                  <BookmarkCheck className="w-3 h-3 mr-1" />
                ) : (
                  <BookmarkPlus className="w-3 h-3 mr-1" />
                )}
                {message.isBookmarked ? 'Sauvé' : 'Sauvegarder'}
              </Button>
              <span className="text-xs text-gray-500">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
