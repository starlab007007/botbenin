
import React from "react";
import { User, Bot } from "lucide-react";

interface Message {
  id: string;
  message_content: string;
  message_type: 'user' | 'bot';
  created_at: string;
}

interface MessagesScrollerProps {
  messages: Message[];
}

export const MessagesScroller: React.FC<MessagesScrollerProps> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm mb-2">Aucun message trouvé</div>
        <div className="text-xs text-gray-400">
          Cette session ne contient pas encore de messages
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500 font-medium mb-2 sticky top-0 bg-white p-1 rounded">
        {messages.length} message(s) dans cette conversation
      </div>
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`flex ${message.message_type === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div 
            className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${
              message.message_type === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-900 border'
            }`}
          >
            <div className="flex items-center space-x-1 mb-1">
              {message.message_type === 'user' ? (
                <User className="w-3 h-3" />
              ) : (
                <Bot className="w-3 h-3" />
              )}
              <span className="text-xs font-medium">
                {message.message_type === 'user' ? 'Utilisateur' : 'Bot'}
              </span>
              <span className="text-xs opacity-75">
                #{index + 1}
              </span>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.message_content}
            </div>
            <div className="text-xs opacity-75 mt-1">
              {new Date(message.created_at).toLocaleString('fr-FR')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
