
import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight, Loader, MessageSquare } from "lucide-react";

interface BotMessage {
  id: string;
  message_content: string;
  created_at: string;
  message_type: string;
  bot_user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
}

interface UnifiedMessageListProps {
  selectedSession: BotSession | null;
  messages: BotMessage[];
  loadingMessages: boolean;
}

export const UnifiedMessageList: React.FC<UnifiedMessageListProps> = ({
  selectedSession,
  messages,
  loadingMessages,
}) => {
  if (!selectedSession) {
    return (
      <Card className="w-1/2 flex flex-col px-3 py-4 items-stretch overflow-auto">
        <div className="flex flex-1 items-center justify-center text-gray-400 text-lg h-full">
          <ChevronRight className="w-6 h-6 mr-1" /> Sélectionnez une session
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-1/2 flex flex-col px-3 py-4 items-stretch overflow-auto">
      <div className="mb-2 font-semibold text-lg text-primary flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Messages de la session
        <span className="text-sm text-gray-500">
          ({selectedSession.source_type === 'anonymous' ? 'anonyme' : 'authentifiée'})
        </span>
      </div>
      
      <div className="text-xs text-gray-600 mb-3">
        Token: {selectedSession.session_token.slice(0, 20)}...
      </div>

      <div className="flex-1 overflow-y-auto max-h-[48vh] space-y-2">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="animate-spin w-6 h-6" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Aucun message trouvé pour cette session</p>
            <p className="text-xs mt-1">
              Les messages peuvent ne pas être liés à cette session
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                "p-3 rounded-lg shadow-sm my-2 max-w-[85%] border",
                msg.message_type === "user"
                  ? "ml-0 bg-blue-50 border-blue-200 self-start"
                  : "ml-auto bg-green-50 border-green-200 self-end"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-gray-700">
                  {msg.message_type === "user" ? "👤 Utilisateur" : "🤖 Bot"}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR')}
                </div>
              </div>
              
              <div className="text-sm text-gray-800 leading-relaxed">
                {msg.message_content}
              </div>
              
              {msg.ip_address && (
                <div className="text-xs text-gray-400 mt-2">
                  IP: {msg.ip_address}
                </div>
              )}
              
              <div className="text-xs text-gray-400 mt-1">
                {new Date(msg.created_at).toLocaleDateString('fr-FR')} à {new Date(msg.created_at).toLocaleTimeString('fr-FR')}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
