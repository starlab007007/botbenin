
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, MessageSquare } from "lucide-react";

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
}

interface EmptyMessageStateProps {
  selectedSession: BotSession;
  onDebugSession: () => void;
}

export const EmptyMessageState: React.FC<EmptyMessageStateProps> = ({
  selectedSession,
  onDebugSession,
}) => {
  return (
    <div className="text-center py-8 text-gray-500">
      <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
      <p className="font-medium">Aucun message trouvé</p>
      <p className="text-xs mt-1">
        Cette session n'a pas encore de messages de conversation
      </p>
      <p className="text-xs mt-2 text-gray-400">
        Session: {selectedSession.source_type} • Token: {selectedSession.session_token.slice(0, 12)}...
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onDebugSession}
        className="mt-3"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        Analyser la session
      </Button>
    </div>
  );
};
