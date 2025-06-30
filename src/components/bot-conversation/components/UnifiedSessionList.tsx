
import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageSquare, Loader, User, Globe, Lock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface BotSession {
  id: string;
  session_token: string;
  last_activity: string;
  started_at: string;
  is_active: boolean;
  entry_point: string;
  user_agent: string | null;
  ip_address: string | null;
  bot_user_id: string | null;
  total_messages?: number;
  source_type: 'anonymous' | 'authenticated';
}

interface UnifiedSessionListProps {
  sessions: BotSession[];
  loadingSessions: boolean;
  selectedSession: BotSession | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSessionSelect: (session: BotSession) => void;
}

export const UnifiedSessionList: React.FC<UnifiedSessionListProps> = ({
  sessions,
  loadingSessions,
  selectedSession,
  query,
  onQueryChange,
  onSessionSelect,
}) => {
  const isMobile = useIsMobile();
  
  // Filtrer les sessions selon la requête
  const filteredSessions = sessions.filter(session => {
    if (!query) return true;
    const searchTerm = query.toLowerCase();
    return (
      session.session_token.toLowerCase().includes(searchTerm) ||
      session.entry_point.toLowerCase().includes(searchTerm) ||
      (session.ip_address && session.ip_address.toLowerCase().includes(searchTerm))
    );
  });

  const getSessionIcon = (session: BotSession) => {
    if (session.source_type === 'anonymous') {
      return <Globe className="w-3 h-3 text-blue-500" />;
    }
    return <Lock className="w-3 h-3 text-green-500" />;
  };

  const getSessionLabel = (session: BotSession) => {
    if (session.source_type === 'anonymous') {
      return `Visiteur anonyme (${session.entry_point})`;
    }
    return `Utilisateur authentifié`;
  };

  return (
    <Card className={`${isMobile ? 'w-full min-h-screen' : 'w-1/3'} flex flex-col gap-2 ${isMobile ? 'px-[2.5%] py-4' : 'px-3 py-4'} overflow-auto`}>
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="text-primary w-4 h-4" />
        <span className="font-semibold">Toutes les sessions</span>
        <Input
          className={`ml-auto ${isMobile ? 'max-w-[40%]' : 'max-w-[130px]'}`}
          placeholder="Rechercher…"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          size={20}
        />
      </div>

      {loadingSessions && <Loader className="animate-spin mx-auto my-8" />}
      
      {!loadingSessions && filteredSessions.length === 0 && (
        <div className="text-gray-500 text-sm text-center mt-8">
          {query ? "Aucune session correspondante" : "Aucune session trouvée"}
        </div>
      )}

      {!loadingSessions &&
        filteredSessions.map(session => (
          <button
            type="button"
            key={`${session.source_type}-${session.id}`}
            className={cn(
              `p-3 mb-2 w-full bg-gray-50 hover:bg-blue-50 flex flex-col border transition cursor-pointer rounded-lg text-left ${isMobile ? 'min-h-[80px]' : ''}`,
              selectedSession?.id === session.id && "border-blue-600 shadow"
            )}
            onClick={() => onSessionSelect(session)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium truncate flex items-center gap-2">
                {getSessionIcon(session)}
                <span className={`${isMobile ? 'text-sm' : 'text-base'}`}>
                  Session {session.session_token.slice(0, 10)}…
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Badge 
                  variant={session.is_active ? "default" : "secondary"}
                  className="text-xs"
                >
                  {session.is_active ? "active" : "terminée"}
                </Badge>
              </div>
            </div>
            
            <div className={`text-xs text-gray-600 mb-1 ${isMobile ? 'break-words' : ''}`}>
              {getSessionLabel(session)}
            </div>
            
            <div className="text-[10px] text-gray-400">
              Dernière activité: {session.last_activity
                ? new Date(session.last_activity).toLocaleString('fr-FR')
                : "Inconnue"}
            </div>
            
            <div className={`text-[10px] text-gray-500 ${isMobile ? 'break-words' : ''}`}>
              Entrée: {session.entry_point} • Messages: {session.total_messages || 0}
            </div>
            
            {session.ip_address && (
              <div className="text-[10px] text-gray-400">
                IP: {session.ip_address}
              </div>
            )}
          </button>
        ))}
    </Card>
  );
};
