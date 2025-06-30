
import React, { useRef, useEffect } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'system';
  agentInfo?: {
    name: string;
    role: string;
    rating: number;
  };
}

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isTyping
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            message.sender === 'user'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-900 border border-gray-200'
          }`}>
            {message.sender === 'agent' && message.agentInfo && (
              <div className="text-xs text-gray-500 mb-1">
                {message.agentInfo.name}
              </div>
            )}
            <p className="whitespace-pre-wrap">{message.content}</p>
            <div className={`text-xs mt-1 ${
              message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      ))}
      
      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
