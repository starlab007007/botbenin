
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, User, Bot, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { BotMessageHistoryItem } from "../hooks/useBotMessageHistory";

interface BotMessageHistoryProps {
  messages: BotMessageHistoryItem[];
  loading: boolean;
  className?: string;
}

export const BotMessageHistory: React.FC<BotMessageHistoryProps> = ({
  messages,
  loading,
  className
}) => {
  if (loading) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-500">Chargement de l'historique...</span>
        </div>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun message dans cette conversation</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4 max-h-96 overflow-y-auto", className)}>
      <div className="space-y-3">
        {messages.map((message) => (
          <div
            key={message.message_id}
            className={cn(
              "flex gap-3 p-3 rounded-lg",
              message.message_type === 'user' 
                ? "bg-blue-50 border-l-4 border-l-blue-500" 
                : "bg-green-50 border-l-4 border-l-green-500"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              message.message_type === 'user' ? "bg-blue-100" : "bg-green-100"
            )}>
              {message.message_type === 'user' ? (
                <User className="w-4 h-4 text-blue-600" />
              ) : (
                <Bot className="w-4 h-4 text-green-600" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {message.message_type === 'user' 
                    ? (message.user_name || 'Utilisateur')
                    : message.bot_name
                  }
                </span>
                <Badge variant={message.message_type === 'user' ? 'secondary' : 'default'} className="text-xs">
                  {message.message_type === 'user' ? 'Utilisateur' : 'Bot'}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-900 mb-2 break-words">
                {message.message_content}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(message.message_timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>
                
                {message.ip_address && (
                  <span>IP: {message.ip_address}</span>
                )}
              </div>
              
              {message.metadata?.source === 'manual_admin_response' && (
                <Badge variant="outline" className="mt-1 text-xs">
                  Réponse manuelle
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
