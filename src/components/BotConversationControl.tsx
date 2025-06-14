
import React, { useState } from "react";
import { Bot, BotSession } from "./bot-conversation/types";
import { filterSessions } from "./bot-conversation/utils";
import { useBots } from "./bot-conversation/hooks/useBots";
import { useSessions } from "./bot-conversation/hooks/useSessions";
import { useMessages } from "./bot-conversation/hooks/useMessages";
import { BotList } from "./bot-conversation/BotList";
import { SessionList } from "./bot-conversation/SessionList";
import { MessageList } from "./bot-conversation/MessageList";

export const BotConversationControl: React.FC = () => {
  const { bots, loadingBots } = useBots();
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [selectedSession, setSelectedSession] = useState<BotSession | null>(null);
  const [query, setQuery] = useState("");

  const { sessions, loadingSessions } = useSessions(selectedBot);
  const { messages, loadingMessages } = useMessages(selectedBot, selectedSession);

  const handleBotSelect = (bot: Bot) => {
    setSelectedBot(bot);
    setSelectedSession(null);
  };

  const filteredSessions = filterSessions(sessions, query);

  return (
    <div className="flex gap-2 h-[70vh]">
      <BotList
        bots={bots}
        loadingBots={loadingBots}
        selectedBot={selectedBot}
        onBotSelect={handleBotSelect}
      />

      <SessionList
        sessions={filteredSessions}
        loadingSessions={loadingSessions}
        selectedSession={selectedSession}
        query={query}
        onQueryChange={setQuery}
        onSessionSelect={setSelectedSession}
      />

      <MessageList
        selectedSession={selectedSession}
        messages={messages}
        loadingMessages={loadingMessages}
      />
    </div>
  );
};
