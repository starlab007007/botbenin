
import { useEffect, useMemo } from "react";
import { useBotUserId } from "./useBotUserId";
import { useMessageFetcher } from "./useMessageFetcher";
import { useRealtimeMessages } from "./useRealtimeMessages";
import { useSendManualResponse } from "./useSendManualResponse";
import { BotMessageHistoryItem } from "../types";

export const useBotMessageHistory = (botId: string | null, sessionToken: string | null) => {
  const { botUserId, loadingBotUserId, errorBotUserId } = useBotUserId(botId, sessionToken);
  
  const { messages, loadingMessages, errorMessages, fetchMessages, setMessages } = useMessageFetcher(botId, botUserId);

  useEffect(() => {
    if (!botId || !sessionToken) {
      setMessages([]);
    }
  }, [botId, sessionToken, setMessages]);

  useEffect(() => {
    if (botUserId) {
      fetchMessages();
    }
  }, [botUserId, fetchMessages]);

  const { realtimeError } = useRealtimeMessages(botUserId, fetchMessages);

  const { sendManualResponse } = useSendManualResponse(botId, sessionToken);

  const loading = loadingBotUserId || loadingMessages;
  const error = useMemo(() => [errorBotUserId, errorMessages, realtimeError].filter(Boolean).join(', '), [errorBotUserId, errorMessages, realtimeError]);

  return {
    messages,
    loading,
    error: error || null,
    sendManualResponse
  };
};

export type { BotMessageHistoryItem };
