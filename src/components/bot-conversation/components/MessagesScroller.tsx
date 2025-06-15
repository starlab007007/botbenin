
import React from "react";
import { User, Bot, MessageCircle } from "lucide-react";

interface Message {
  id: string;
  message_content: string;
  message_type: "user" | "bot";
  created_at: string;
  bot_user_id?: string;
  // Ajout éventuel de display name ou extra si dispo
}

interface MessagesScrollerProps {
  messages: Message[];
}

export const MessagesScroller: React.FC<MessagesScrollerProps> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 animate-fade-in">
        <div className="flex flex-col items-center">
          <MessageCircle className="w-6 h-6 text-gray-300 mb-2" />
          <div className="text-gray-400 text-sm font-semibold mb-1">Aucun message trouvé</div>
          <div className="text-xs text-gray-400">Cette session ne contient pas encore de messages</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="sticky top-0 z-20 flex items-center gap-2 mb-2 bg-white/80 backdrop-blur px-3 py-2 rounded-md border shadow-sm">
        <MessageCircle className="w-4 h-4 text-blue-400" />
        <span className="font-medium text-blue-600 text-sm">
          {messages.length} message{messages.length > 1 && "s"} dans cette conversation
        </span>
      </div>
      {messages.map((message, idx) => {
        const isUser = message.message_type === "user";
        return (
          <div
            key={message.id}
            className={`
              flex ${isUser ? "justify-end" : "justify-start"}
              transition-all duration-200
            `}
          >
            <div
              className={`
                max-w-[80%] md:max-w-[60%] px-4 py-3
                rounded-2xl shadow
                relative
                group
                border
                ${isUser
                  ? "bg-blue-600 text-white border-blue-500 rounded-br-lg rounded-tr-2xl"
                  : "bg-white text-gray-900 border-gray-200 rounded-bl-lg rounded-tl-2xl"}
                animate-fade-in
              `}
            >
              {/* Header info (user/bot + timestamp) */}
              <div className="flex items-center space-x-2 mb-1">
                <span
                  className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold
                    ${isUser
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-blue-700 border border-blue-100"}
                  `}
                >
                  {isUser ? (
                    <>
                      <User className="w-3 h-3" />
                      Utilisateur
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3" />
                      Bot
                    </>
                  )}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {new Date(message.created_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {message.bot_user_id && !isUser && (
                  <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                    ID:{' '}
                    <span className="font-mono">{message.bot_user_id.slice(0, 8)}</span>
                  </span>
                )}
              </div>
              {/* Contenu du message */}
              <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words font-normal">
                {message.message_content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

