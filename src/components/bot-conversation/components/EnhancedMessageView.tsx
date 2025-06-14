
import React from "react";
import { BotMessageHistory } from "./BotMessageHistory";
import { useBotMessageHistory } from "../hooks/useBotMessageHistory";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";

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
  const { messages, loading, error, isConnected } = useBotMessageHistory(
    selectedBot?.id || null,
    selectedSession?.session_token || null
  );

  if (!selectedBot || !selectedSession) {
    return (
      <Card className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>Sélectionnez un bot et une session pour voir l'historique des messages</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex-1 p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div>
          <h3 className="font-semibold text-lg">{selectedBot.name}</h3>
          <p className="text-sm text-gray-600">
            Session: {selectedSession.session_token.substring(0, 8)}...
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className="flex items-center gap-1">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-400" />
            )}
            <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
              {isConnected ? "Temps réel" : "Déconnecté"}
            </Badge>
          </div>
          
          <Badge variant="outline" className="text-xs">
            {messages.length} message(s)
          </Badge>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <BotMessageHistory
          messages={messages}
          loading={loading}
          className="h-full"
        />
      </div>
    </Card>
  );
};
