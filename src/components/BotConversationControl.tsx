
import React, { useState } from "react";
import { Bot } from "./bot-conversation/types";
import { useBots } from "./bot-conversation/hooks/useBots";
import { useBotSessions } from "./bot-conversation/hooks/useBotSessions";
import { useBotMessages } from "./bot-conversation/hooks/useBotMessages";
import { BotList } from "./bot-conversation/BotList";
import { UnifiedSessionList } from "./bot-conversation/components/UnifiedSessionList";
import { UnifiedMessageList } from "./bot-conversation/components/UnifiedMessageList";

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

interface BotMessage {
  id: string;
  message_content: string;
  created_at: string;
  message_type: string;
  bot_user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export const BotConversationControl: React.FC = () => {
  const { bots, loadingBots } = useBots();
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [selectedSession, setSelectedSession] = useState<BotSession | null>(null);
  const [query, setQuery] = useState("");

  const { sessions, loadingSessions } = useBotSessions(selectedBot);
  const { messages, loadingMessages, setMessages, debugInfo } = useBotMessages(selectedBot, selectedSession);

  const handleBotSelect = (bot: Bot) => {
    console.log(`[BotConversationControl] Bot sélectionné: ${bot.name} (id: ${bot.id})`);
    setSelectedBot(bot);
    setSelectedSession(null);
  };

  const handleSessionSelect = (session: BotSession) => {
    console.log(`[BotConversationControl] Session sélectionnée: ${session.session_token} (type: ${session.source_type})`);
    setSelectedSession(session);
  };

  const handleMessagesUpdate = (updatedMessages: BotMessage[]) => {
    setMessages(updatedMessages);
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

      <UnifiedMessageList
        selectedSession={selectedSession}
        messages={messages}
        loadingMessages={loadingMessages}
        selectedBot={selectedBot}
        onMessagesUpdate={handleMessagesUpdate}
        debugInfo={debugInfo}
      />
    </div>
  );
};
