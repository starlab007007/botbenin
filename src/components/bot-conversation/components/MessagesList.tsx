
import React from "react";
import { Loader, MessageSquare } from "lucide-react";
import { MessageItem } from "./MessageItem";
import { EmptyMessageState } from "./EmptyMessageState";

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
  bot_user_id?: string | null;
}

interface MessagesListProps {
  messages: BotMessage[];
  loadingMessages: boolean;
  selectedSession: BotSession;
  onDebugSession: () => void;
  debugInfo?: any; // Ajouté pour passer les infos de debug
}

export const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  loadingMessages,
  selectedSession,
  onDebugSession,
  debugInfo
}) => {
  if (loadingMessages) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="animate-spin w-6 h-6" />
        <span className="ml-2 text-sm text-gray-500">Chargement des messages...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <EmptyMessageState 
        selectedSession={selectedSession}
        onDebugSession={onDebugSession}
        debugInfo={debugInfo}
      />
    );
  }

  return (
    <>
      <div className="text-xs text-green-600 mb-2 flex items-center gap-1">
        <MessageSquare className="w-3 h-3" />
        {messages.length} message(s) trouvé(s)
      </div>
      {messages.map(msg => (
        <MessageItem key={msg.id} message={msg} />
      ))}
    </>
  );
};
