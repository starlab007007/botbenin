
import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, MessageSquare, RefreshCw, Info } from "lucide-react";

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
          <span className="ml-2 px-2 py-1 rounded bg-gray-200 text-xs text-gray-700 border border-gray-300">
            {selectedSession.session_token}
          </span>
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
      {debugTokens && (
        <div className="mt-2 flex items-center text-[11px] text-yellow-600 bg-yellow-50 p-2 rounded gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            Tokens session trouvés dans les derniers messages : <b>{debugTokens}</b>
          </span>
        </div>
      )}
    </CardHeader>
  );
};
