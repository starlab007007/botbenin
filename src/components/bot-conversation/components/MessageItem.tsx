
import React from "react";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

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
  return (
    <div
      className={cn(
        "p-3 rounded-lg shadow-sm my-2 border flex items-start gap-2",
        message.message_type === "user"
          ? "bg-blue-50 border-blue-200"
          : "bg-green-50 border-green-200"
      )}
    >
      <div className="flex-shrink-0 mt-1">
        {message.message_type === "user" ? (
          <User className="w-4 h-4 text-blue-600" />
        ) : (
          <Bot className="w-4 h-4 text-green-600" />
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
          {message.message_content}
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
