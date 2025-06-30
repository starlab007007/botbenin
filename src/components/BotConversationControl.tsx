
import React, { useState } from "react";
import { Bot } from "./bot-conversation/types";
import { useBots } from "./bot-conversation/hooks/useBots";
import { useBotSessions } from "./bot-conversation/hooks/useBotSessions";
import { BotList } from "./bot-conversation/BotList";
import { UnifiedSessionList } from "./bot-conversation/components/UnifiedSessionList";
import { EnhancedMessageView } from "./bot-conversation/components/EnhancedMessageView";
import { DetailedSessionInfo } from "./bot-conversation/components/DetailedSessionInfo";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

type MobileView = 'bots' | 'sessions' | 'messages';

export const BotConversationControl: React.FC = () => {
  const { bots, loadingBots } = useBots();
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [selectedSession, setSelectedSession] = useState<BotSession | null>(null);
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>('bots');
  const isMobile = useIsMobile();

  const { sessions, loadingSessions } = useBotSessions(selectedBot);

  const handleBotSelect = (bot: Bot) => {
    console.log(`[BotConversationControl] Bot sélectionné: ${bot.name} (id: ${bot.id})`);
    setSelectedBot(bot);
    setSelectedSession(null);
    if (isMobile) {
      setMobileView('sessions');
    }
  };

  const handleSessionSelect = (session: BotSession) => {
    console.log(`[BotConversationControl] Session sélectionnée: ${session.session_token} (type: ${session.source_type})`);
    setSelectedSession(session);
    if (isMobile) {
      setMobileView('messages');
    }
  };

  const handleMobileBack = () => {
    if (mobileView === 'messages') {
      setMobileView('sessions');
      setSelectedSession(null);
    } else if (mobileView === 'sessions') {
      setMobileView('bots');
      setSelectedBot(null);
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen w-full bg-gray-50 overflow-x-hidden">
        <div className="w-full max-w-none">
          {/* Navigation mobile */}
          {(mobileView === 'sessions' || mobileView === 'messages') && (
            <div className="sticky top-0 z-10 bg-white border-b px-[2.5%] py-3 flex items-center gap-3">
              <Button variant="outline" onClick={handleMobileBack} size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Retour
              </Button>
              <div className="text-sm font-medium truncate">
                {mobileView === 'sessions' && selectedBot && `Bot: ${selectedBot.name}`}
                {mobileView === 'messages' && selectedSession && `Session: ${selectedSession.session_token.slice(0, 10)}...`}
              </div>
            </div>
          )}

          {/* Informations détaillées de la session */}
          {selectedSession && mobileView === 'messages' && (
            <div className="px-[2.5%] py-3 bg-white border-b">
              <DetailedSessionInfo 
                session={selectedSession} 
                botName={selectedBot?.name}
              />
            </div>
          )}

          {/* Contenu en fonction de la vue mobile */}
          <div className={`${mobileView === 'bots' ? 'px-[2.5%] py-3' : ''}`}>
            {mobileView === 'bots' && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold mb-4">Sélectionnez un bot</h2>
                <div className="space-y-2">
                  {loadingBots ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : (
                    bots.map(bot => (
                      <Button
                        key={bot.id}
                        variant="outline"
                        onClick={() => handleBotSelect(bot)}
                        className="w-full h-auto p-4 justify-start text-left"
                      >
                        <div className="flex flex-col items-start w-full">
                          <span className="font-medium truncate">{bot.name}</span>
                          {bot.is_active && (
                            <span className="text-xs text-green-600">Actif</span>
                          )}
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </div>
            )}

            {mobileView === 'sessions' && selectedBot && (
              <UnifiedSessionList
                sessions={sessions}
                loadingSessions={loadingSessions}
                selectedSession={selectedSession}
                query={query}
                onQueryChange={setQuery}
                onSessionSelect={handleSessionSelect}
              />
            )}

            {mobileView === 'messages' && selectedSession && (
              <EnhancedMessageView
                selectedBot={selectedBot}
                selectedSession={selectedSession}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Vue desktop (existante)
  return (
    <div className="space-y-4">
      {/* Informations détaillées de la session sélectionnée */}
      {selectedSession && (
        <DetailedSessionInfo 
          session={selectedSession} 
          botName={selectedBot?.name}
        />
      )}
      
      {/* Vue principale en 3 colonnes */}
      <div className="flex gap-2 h-[60vh]">
        <BotList
          bots={bots}
          loadingBots={loadingBots}
          selectedBot={selectedBot}
          onBotSelect={handleBotSelect}
        />

        <UnifiedSessionList
          sessions={sessions}
          loadingSessions={loadingSessions}
          selectedSession={selectedSession}
          query={query}
          onQueryChange={setQuery}
          onSessionSelect={handleSessionSelect}
        />

        <EnhancedMessageView
          selectedBot={selectedBot}
          selectedSession={selectedSession}
        />
      </div>
    </div>
  );
};
