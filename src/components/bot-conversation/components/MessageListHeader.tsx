
import React from "react";
import { MessageSquare } from "lucide-react";

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
}

interface MessageListHeaderProps {
  selectedSession: BotSession;
}

export const MessageListHeader: React.FC<MessageListHeaderProps> = ({
  selectedSession
}) => {
  return (
    <>
      <div className="mb-2 font-semibold text-lg text-primary flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Messages de la session
        <span className="text-sm text-gray-500">
          ({selectedSession.source_type === 'anonymous' ? 'anonyme' : 'authentifiée'})
        </span>
      </div>
      <div className="text-xs text-gray-600 mb-3">
        Token: {selectedSession.session_token.slice(0, 20)}...
        {selectedSession.bot_user_id && (
          <div className="mt-1">
            User ID: {selectedSession.bot_user_id.slice(0, 8)}...
          </div>
        )}
      </div>
    </>
  );
};
