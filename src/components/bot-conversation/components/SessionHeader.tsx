
import React, { useState } from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, RefreshCw, Copy } from "lucide-react";

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
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  selectedBot,
  selectedSession,
  loading,
  refetch,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedSession.session_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <CardHeader className="pb-0 pt-2 px-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        <CardTitle className="text-[13px] font-semibold flex items-center">
          <MessageSquare className="w-4 h-4 mr-2" />
          {/* Suffixe concis */}
          Messages • Session {selectedSession.session_token.slice(0, 10)}...
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge variant={selectedSession.source_type === 'anonymous' ? 'secondary' : 'default'} className="text-[11px] px-2 py-0.5">
            {selectedSession.source_type}
          </Badge>
          <Button 
            onClick={refetch} 
            variant="ghost" 
            size="sm"
            disabled={loading}
            className="px-2"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-blue-700 mt-1 select-all">
        <span className="font-mono bg-blue-50 border border-blue-200 px-2 rounded cursor-pointer truncate max-w-[180px]" title="Session Token admin">
          {selectedSession.session_token}
        </span>
        <button
          aria-label="Copier le token"
          className="pl-1 text-blue-500 hover:text-blue-700 focus:outline-none"
          onClick={handleCopy}
        >
          <Copy className="w-4 h-4 inline-block relative" />
          {copied && <span className="ml-1 text-green-500">copié !</span>}
        </button>
      </div>
      <div className="text-[11px] text-gray-500 mt-0 pt-0">
        Bot: {selectedBot?.name} • Entrée: {selectedSession.entry_point}
      </div>
    </CardHeader>
  );
};
