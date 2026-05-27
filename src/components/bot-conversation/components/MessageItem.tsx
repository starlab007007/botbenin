
import React from "react";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { SafeText } from '@/components/security/SafeText';

interface BotMessage {
  id: string;
  message_content: string;
  created_at: string;
  message_type: string;
  bot_user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

interface MessageItemProps {
  message: BotMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.message_type === "user";
  return (
    <div className={cn("flex my-2", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("chat-bubble", isUser ? "chat-bubble-out" : "chat-bubble-in", "flex items-start gap-2 max-w-[88%]")}>
        <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <User className="w-4 h-4 text-[hsl(var(--chat-accent))]" />
        ) : (
          <Bot className="w-4 h-4 text-[hsl(var(--chat-accent))]" />
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-medium text-gray-700">
            {message.message_type === "user" ? "Utilisateur" : "Bot"}
          </div>
          <div className="text-xs text-gray-400">
            {new Date(message.created_at).toLocaleTimeString('fr-FR')}
          </div>
        </div>
        
        <div className="text-sm text-gray-800 leading-relaxed">
          <SafeText>{message.message_content}</SafeText>
        </div>
        
        <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
          <span>
            {new Date(message.created_at).toLocaleDateString('fr-FR')} à {new Date(message.created_at).toLocaleTimeString('fr-FR')}
          </span>
          {message.bot_user_id && (
            <span className="bg-gray-100 px-1 rounded">
              ID: {message.bot_user_id.slice(0, 8)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
