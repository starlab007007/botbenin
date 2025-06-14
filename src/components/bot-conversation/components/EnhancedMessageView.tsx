
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, History, MessageSquare } from "lucide-react";
import { BotMessageHistory } from "./BotMessageHistory";
import { ManualResponseForm } from "./ManualResponseForm";
import { useBotMessageHistory } from "../hooks/useBotMessageHistory";

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
}

interface EnhancedMessageViewProps {
  selectedBot: any;
  selectedSession: BotSession | null;
}

export const EnhancedMessageView: React.FC<EnhancedMessageViewProps> = ({
  selectedBot,
  selectedSession
}) => {
  const { messages, loading, error, sendManualResponse } = useBotMessageHistory(
    selectedBot?.id || null,
    selectedSession?.session_token || null
  );

  if (!selectedSession) {
    return (
      <Card className="w-1/2 flex flex-col px-3 py-4 items-stretch overflow-auto">
        <div className="flex flex-1 items-center justify-center text-gray-400 text-lg h-full">
          <ChevronRight className="w-6 h-6 mr-1" /> Sélectionnez une session
        </div>
      </Card>
    );
  }

  const handleSendResponse = async (message: string) => {
    await sendManualResponse(message);
  };

  return (
    <Card className="w-1/2 flex flex-col px-3 py-4 items-stretch overflow-auto">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <History className="w-5 h-5" />
          Conversation - Session {selectedSession.session_token.slice(0, 10)}...
        </h3>
        <p className="text-sm text-gray-600">
          Type: {selectedSession.source_type} • Bot: {selectedBot?.name}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">Erreur: {error}</p>
        </div>
      )}

      <div className="flex-1 mb-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Historique des messages ({messages.length})
          </h4>
        </div>
        
        <BotMessageHistory 
          messages={messages} 
          loading={loading}
          className="max-h-64"
        />
      </div>

      <ManualResponseForm
        onSendResponse={handleSendResponse}
        disabled={loading}
        botName={selectedBot?.name}
      />
    </Card>
  );
};
