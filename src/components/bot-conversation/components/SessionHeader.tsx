
import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, MessageSquare, RefreshCw, Info, Bug } from "lucide-react";

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
  last_activity: string;
  entry_point: string;
  total_messages?: number;
}

interface SessionHeaderProps {
  selectedBot: any;
  selectedSession: BotSession;
  loading: boolean;
  refetch: () => void;
  debugTokens: string | null;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  selectedBot,
  selectedSession,
  loading,
  refetch,
  debugTokens,
}) => {
  return (
    <CardHeader className="pb-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center">
          <MessageSquare className="w-4 h-4 mr-2" />
          Messages - Session {selectedSession.session_token.slice(0, 10)}...
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge variant={selectedSession.source_type === 'anonymous' ? 'secondary' : 'default'}>
            {selectedSession.source_type}
          </Badge>
          <Button 
            onClick={refetch} 
            variant="ghost" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      <div className="text-xs text-gray-500">
        Bot: {selectedBot?.name} • Entrée: {selectedSession.entry_point}
      </div>

      {/* Informations de debug étendues */}
      <div className="mt-2 space-y-2">
        <div className="flex items-center text-[11px] text-blue-600 bg-blue-50 p-2 rounded gap-2">
          <Bug className="w-4 h-4 shrink-0" />
          <div className="flex-1">
            <div><b>Token recherché:</b> {selectedSession.session_token}</div>
            {selectedSession.bot_user_id && (
              <div><b>Bot User ID:</b> {selectedSession.bot_user_id}</div>
            )}
          </div>
        </div>

        {debugTokens && (
          <div className="text-[11px] text-yellow-600 bg-yellow-50 p-2 rounded">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 shrink-0" />
              <b>Tokens trouvés en base (10 derniers messages):</b>
            </div>
            <div className="font-mono break-all">
              {debugTokens}
            </div>
          </div>
        )}

        {!debugTokens && (
          <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>Aucun token de session trouvé dans les derniers messages</span>
          </div>
        )}
      </div>
    </CardHeader>
  );
};
