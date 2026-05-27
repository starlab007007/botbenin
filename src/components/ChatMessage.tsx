
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
  isHistoryMessage?: boolean; // Nouveau prop pour identifier les messages d'historique
}

interface ChatMessageProps {
  message: Message;
  onToggleBookmark: (messageId: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onToggleBookmark }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Si c'est un message utilisateur ou un message d'historique, afficher immédiatement
    if (message.isUser || message.isHistoryMessage) {
      setDisplayedContent(message.content);
      setIsTyping(false);
      return;
    }

    // Animation de frappe uniquement pour les nouveaux messages du bot
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
  }, [message.content, message.isUser, message.isHistoryMessage]);

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4 px-1`}>
      <div className={`flex items-start space-x-2 w-[90%] md:max-w-[80%] ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        {!message.isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mt-1 flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}

        {message.isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center mt-1 flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Message Content */}
        <div className="space-y-1 flex-1 min-w-0">
          {/* Bookmark button for AI messages */}
          {!message.isUser && (
            <div className="flex justify-end mb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleBookmark(message.id)}
                className={`h-6 w-6 p-0 rounded-full transition-all duration-200 ${
                  message.isBookmarked 
                    ? 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
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

          <div className={`chat-bubble ${message.isUser ? 'chat-bubble-out' : 'chat-bubble-in'}`}>
            <div className="text-sm leading-relaxed break-words">
              {isTyping ? (
                <div className="whitespace-pre-wrap">
                  <MediaRenderer content={displayedContent} />
                  <span className="inline-block w-1 h-4 bg-gray-400 ml-1 animate-pulse rounded"></span>
                </div>
              ) : (
                <MediaRenderer content={displayedContent} />
              )}
            </div>
          </div>

          {/* Timestamp */}
          {!isTyping && (
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
