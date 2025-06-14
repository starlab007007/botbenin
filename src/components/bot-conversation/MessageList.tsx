
import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight, Loader } from "lucide-react";
import { BotSession, Message } from './types';

interface MessageListProps {
  selectedSession: BotSession | null;
  messages: Message[];
  loadingMessages: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
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
      <div className="mb-2 font-semibold text-lg text-primary flex items-center">
        Détails de la session {selectedSession.session_token.slice(0, 10)}…
      </div>
      <div className="flex-1 overflow-y-auto max-h-[48vh] space-y-2">
        {loadingMessages ? (
          <Loader className="animate-spin mx-auto my-16" />
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                "p-2 rounded shadow-sm my-1 max-w-[75%]",
                msg.message_type === "user"
                  ? "ml-0 bg-blue-100 text-right self-start"
                  : "ml-auto bg-gray-200 self-end"
              )}
            >
              <div className="text-xs text-gray-500 mb-1">
                {msg.message_type === "user" ? "Visiteur/utilisateur" : "Bot"}
              </div>
              <div className="text-sm">{msg.message_content}</div>
              <div className="text-xs text-gray-400 text-right">
                {new Date(msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
