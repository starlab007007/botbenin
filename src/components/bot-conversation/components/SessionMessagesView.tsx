
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSessionMessages } from "../hooks/useSessionMessages";
import { ChevronRight, User, Bot, Loader, RefreshCw, MessageSquare } from "lucide-react";

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
  last_activity: string;
  entry_point: string;
  total_messages?: number;
}

interface SessionMessagesViewProps {
  selectedBot: any;
  selectedSession: BotSession | null;
}

export const SessionMessagesView: React.FC<SessionMessagesViewProps> = ({
  selectedBot,
  selectedSession
}) => {
  const { messages, loading, error, refetch } = useSessionMessages(
    selectedBot?.id || null,
    selectedSession?.session_token || null
  );

  if (!selectedSession) {
    return (
      <Card className="w-1/2 flex flex-col px-3 py-4 items-stretch overflow-auto">
        <div className="flex flex-1 items-center justify-center text-gray-400 text-lg h-full">
          <ChevronRight className="w-6 h-6 mr-1" /> Sélectionnez une session pour voir les messages
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-1/2 flex flex-col px-3 py-4 items-stretch overflow-auto">
      <CardHeader className="pb-3">
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
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-3 p-3">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm text-gray-500">Chargement des messages...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="text-red-500 text-sm mb-2">Erreur: {error}</div>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="w-3 h-3 mr-1" />
              Réessayer
            </Button>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-sm mb-2">Aucun message trouvé</div>
            <div className="text-xs text-gray-400">
              Cette session ne contient pas encore de messages
            </div>
          </div>
        )}

        {!loading && messages.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs text-gray-500 font-medium mb-2">
              {messages.length} message(s) dans cette conversation
            </div>
            
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.message_type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    message.message_type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-1 mb-1">
                    {message.message_type === 'user' ? (
                      <User className="w-3 h-3" />
                    ) : (
                      <Bot className="w-3 h-3" />
                    )}
                    <span className="text-xs font-medium">
                      {message.message_type === 'user' ? 'Utilisateur' : 'Bot'}
                    </span>
                    <span className="text-xs opacity-75">
                      #{index + 1}
                    </span>
                  </div>
                  
                  <div className="text-sm leading-relaxed">
                    {message.message_content}
                  </div>
                  
                  <div className="text-xs opacity-75 mt-1">
                    {new Date(message.created_at).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
