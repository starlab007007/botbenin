
import React, { useState } from "react";
import { Bot } from "./bot-conversation/types";
import { useBots } from "./bot-conversation/hooks/useBots";
import { useBotSessions } from "./bot-conversation/hooks/useBotSessions";
import { BotList } from "./bot-conversation/BotList";
import { UnifiedSessionList } from "./bot-conversation/components/UnifiedSessionList";
import { EnhancedMessageView } from "./bot-conversation/components/EnhancedMessageView";

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

export const BotConversationControl: React.FC = () => {
  const { bots, loadingBots } = useBots();
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [selectedSession, setSelectedSession] = useState<BotSession | null>(null);
  const [query, setQuery] = useState("");

  const { sessions, loadingSessions } = useBotSessions(selectedBot);

  const handleBotSelect = (bot: Bot) => {
    console.log(`[BotConversationControl] Bot sélectionné: ${bot.name} (id: ${bot.id})`);
    setSelectedBot(bot);
    setSelectedSession(null);
  };

  const handleSessionSelect = (session: BotSession) => {
    console.log(`[BotConversationControl] Session sélectionnée: ${session.session_token} (type: ${session.source_type})`);
    setSelectedSession(session);
  };

  return (
    <div className="flex gap-2 h-[70vh]">
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
  );
};
