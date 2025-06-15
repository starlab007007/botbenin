
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
  // debugTokens: string | null; // Removed this prop as it's no longer used
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  selectedBot,
  selectedSession,
  loading,
  refetch,
  // debugTokens // Removed from props
}) => {
  return (
    // On passe pb-3 à pb-1 pour réduire l'espace bas, flex-shrink reste
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
      {/* On retire la marge verticale excessive ici en réduisant la taille du texte et la marge top */}
      <div className="text-xs text-gray-500 mt-0">
        Bot: {selectedBot?.name} • Entrée: {selectedSession.entry_point}
      </div>
      {/* Plus d’affichage debug ici */}
    </CardHeader>
  );
};
