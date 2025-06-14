
import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MessageSquare, Loader, User } from "lucide-react";
import { BotSession } from './types';
import { getSessionUserLabel } from './utils';

interface SessionListProps {
  sessions: BotSession[];
  loadingSessions: boolean;
  selectedSession: BotSession | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSessionSelect: (session: BotSession) => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  loadingSessions,
  selectedSession,
  query,
  onQueryChange,
  onSessionSelect,
}) => {
  return (
    <Card className="w-1/3 flex flex-col gap-2 px-3 py-4 overflow-auto">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="text-primary w-4 h-4" />
        <span className="font-semibold">Conversations publiques</span>
        <Input
          className="ml-auto max-w-[130px]"
          placeholder="Rechercher…"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          size={20}
        />
      </div>
      {loadingSessions && <Loader className="animate-spin mx-auto my-8" />}
      {!loadingSessions && sessions.length === 0 && (
        <div className="text-gray-500 text-sm text-center mt-8">
          Aucune session publique trouvée
        </div>
      )}
      {!loadingSessions &&
        sessions.map(s => (
          <button
            type="button"
            key={s.id}
            className={cn(
              "p-3 mb-2 w-full bg-gray-50 hover:bg-blue-50 flex flex-col border transition cursor-pointer rounded-lg text-left",
              selectedSession?.id === s.id && "border-blue-600 shadow"
            )}
            onClick={() => onSessionSelect(s)}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium truncate">
                Session {s.session_token.slice(0, 10)}…
              </div>
              <div className={cn("text-xs rounded px-2 py-0.5 ml-2",
                s.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200 text-gray-500"
              )}>
                {s.is_active ? "active" : "terminée"}
              </div>
              <span className="ml-2 flex items-center text-xs">
                <User className="w-3 h-3 mr-1" />
                {getSessionUserLabel(s)}
              </span>
            </div>
            <div className="text-[10px] text-gray-400">
              {s.last_activity
                ? new Date(s.last_activity).toLocaleString()
                : ""}
            </div>
            <div className="truncate text-xs text-gray-600">
              Entrée : {s.entry_point}
            </div>
          </button>
        ))}
    </Card>
  );
};
