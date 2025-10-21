
import React from "react";
import { User, Bot, MessageCircle } from "lucide-react";
import { SafeText } from '@/components/security/SafeText';

interface Message {
  id: string;
  message_content: string;
  message_type: "user" | "bot";
  created_at: string;
  bot_user_id?: string;
}

interface MessagesScrollerProps {
  messages: Message[];
}

export const MessagesScroller: React.FC<MessagesScrollerProps> = ({ messages }) => {
  // Notification en top totalement sticky et plus discrète
  return (
    <div className="relative h-full w-full">
      <div className="sticky z-30 top-0 left-0 w-full flex justify-center mb-1 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 shadow-sm text-xs font-semibold transition-all animate-fade-in">
          <MessageCircle className="w-3.5 h-3.5" />
          {messages.length > 0 
            ? (<span>{messages.length}&nbsp;message{messages.length > 1 && "s"} dans cette conversation</span>)
            : (<span>Aucun message trouvé</span>)
          }
        </div>
      </div>

      {/* Si aucun message */}
      {messages.length === 0 && (
        <div className="text-center py-8 animate-fade-in">
          <div className="flex flex-col items-center">
            <div className="h-7" />
            <div className="text-gray-400 text-sm font-semibold mb-1">Aucun message trouvé</div>
            <div className="text-xs text-gray-400">Cette session ne contient pas encore de messages</div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-4 pt-2 pb-1 w-full animate-fade-in">
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
                  max-w-[78%] md:max-w-[58%] px-4 py-2.5
                  rounded-2xl shadow-sm
                  relative group border
                  ${isUser
                    ? "bg-blue-600 text-white border-blue-400 rounded-br-lg rounded-tr-2xl"
                    : "bg-white text-gray-900 border-gray-200 rounded-bl-lg rounded-tl-2xl"}
                  animate-fade-in
                `}
              >
                {/* En-tête */}
                <div className="flex items-center space-x-2 mb-1.5">
                  <span
                    className={`
                      inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold
                      ${isUser
                        ? "bg-blue-500 text-white"
                        : "bg-blue-50 text-blue-700 border border-blue-100"}
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
                  <span className="text-[11px] text-gray-400 font-mono">
                    {new Date(message.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {message.bot_user_id && !isUser && (
                    <span className="ml-2 text-[11px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded">
                      ID: <span className="font-mono">{message.bot_user_id.slice(0, 8)}</span>
                    </span>
                  )}
                </div>
                {/* Contenu du message */}
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words font-normal">
                  <SafeText>{message.message_content}</SafeText>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
