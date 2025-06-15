import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, MessageSquare, RefreshCw, Info, Bug, Copy } from "lucide-react";
import { useState } from "react";

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
  // debugTokens: string | null; // Removed this prop as it's no longer used
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  selectedBot,
  selectedSession,
  loading,
  refetch,
  // debugTokens // Removed from props
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedSession.session_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <CardHeader className="pb-1 flex-shrink-0">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center">
          <MessageSquare className="w-4 h-4 mr-2" />
          {/* Suffixe plus concis pour ne pas rallonger la ligne */}
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
      <div className="flex items-center gap-2 text-xs text-blue-700 mt-1 select-all">
        <span className="font-mono bg-blue-50 border border-blue-200 px-2 rounded cursor-pointer" title="Session Token admin">
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
      <div className="text-xs text-gray-500 mt-0">
        Bot: {selectedBot?.name} • Entrée: {selectedSession.entry_point}
      </div>
    </CardHeader>
  );
};
