
import React from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, AlertTriangle, Database } from "lucide-react";

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
}

interface EmptyMessageStateProps {
  selectedSession: BotSession;
  onDebugSession: () => void;
  debugInfo?: any;
}

export const EmptyMessageState: React.FC<EmptyMessageStateProps> = ({
  selectedSession,
  onDebugSession,
  debugInfo
}) => {
  const hasDebugInfo = debugInfo && debugInfo.final_result;
  const hasRecentMessages = debugInfo?.strategy3_recent_messages?.count > 0;
  const totalBotMessages = debugInfo?.strategy4_all_bot_messages?.total_count || 0;

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        {totalBotMessages === 0 ? (
          <Database className="w-8 h-8 text-gray-400" />
        ) : (
          <MessageSquare className="w-8 h-8 text-gray-400" />
        )}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {totalBotMessages === 0 ? "Aucun message dans ce bot" : "Aucun message trouvé"}
      </h3>
      
      <div className="text-sm text-gray-600 mb-4 space-y-1">
        {totalBotMessages === 0 ? (
          <p>Ce bot n'a encore reçu aucun message</p>
        ) : (
          <>
            <p>Cette session n'a pas encore de messages de conversation</p>
            <p className="text-xs">
              <strong>Session:</strong> {selectedSession.source_type} • 
              <strong> Token:</strong> {selectedSession.session_token.slice(0, 12)}...
            </p>
          </>
        )}
      </div>

      {hasDebugInfo && (
        <div className="w-full max-w-md bg-gray-50 rounded-lg p-3 mb-4 text-xs text-left">
          <div className="font-medium mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Informations de debug:
          </div>
          <div className="space-y-1 text-gray-600">
            <div>• Messages par bot_user_id: {debugInfo.strategy1_bot_user_search?.count || 0}</div>
            <div>• Messages par token: {debugInfo.strategy2_token_metadata_search?.count || 0}</div>
            <div>• Messages récents du bot: {debugInfo.strategy3_recent_messages?.count || 0}</div>
            <div>• Total messages bot: {totalBotMessages}</div>
          </div>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onDebugSession}
        className="text-xs"
      >
        <AlertTriangle className="w-3 h-3 mr-1" />
        {hasDebugInfo ? "Actualiser debug" : "Analyser la session"}
      </Button>

      {hasRecentMessages && (
        <p className="text-xs text-blue-600 mt-2">
          ℹ️ Il y a {debugInfo.strategy3_recent_messages.count} messages récents dans ce bot, 
          mais aucun ne correspond à cette session
        </p>
      )}
    </div>
  );
};
