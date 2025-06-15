
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Globe, User, MessageSquare, Activity } from "lucide-react";

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
  last_activity: string;
  started_at: string;
  entry_point: string;
  total_messages?: number;
  is_active: boolean;
  ip_address?: string | null;
}

interface DetailedSessionInfoProps {
  session: BotSession;
  botName?: string;
}

export const DetailedSessionInfo: React.FC<DetailedSessionInfoProps> = ({
  session,
  botName
}) => {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Informations de la session</span>
          <Badge variant={session.is_active ? "default" : "secondary"}>
            {session.is_active ? "Active" : "Terminée"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <User className="w-3 h-3 text-gray-500" />
              <span className="font-medium">Type:</span>
              <Badge variant={session.source_type === 'anonymous' ? 'secondary' : 'default'} className="text-xs">
                {session.source_type === 'anonymous' ? 'Anonyme' : 'Authentifié'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Globe className="w-3 h-3 text-gray-500" />
              <span className="font-medium">Entrée:</span>
              <span>{session.entry_point}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-3 h-3 text-gray-500" />
              <span className="font-medium">Messages:</span>
              <span>{session.total_messages || 0}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="font-medium">Début:</span>
              <span>{new Date(session.started_at).toLocaleString('fr-FR')}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Activity className="w-3 h-3 text-gray-500" />
              <span className="font-medium">Dernière activité:</span>
              <span>{new Date(session.last_activity).toLocaleString('fr-FR')}</span>
            </div>
            
            {session.ip_address && (
              <div className="flex items-center space-x-2">
                <Globe className="w-3 h-3 text-gray-500" />
                <span className="font-medium">IP:</span>
                <span className="font-mono">{session.ip_address}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex items-center space-x-2">
            <span className="font-medium">Token de session:</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
              {session.session_token}
            </code>
          </div>
        </div>
        
        {botName && (
          <div className="flex items-center space-x-2">
            <span className="font-medium">Bot:</span>
            <Badge variant="outline">{botName}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
