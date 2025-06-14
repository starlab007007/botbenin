
import { useEffect, useMemo } from "react";
import { useBotUserId } from "./useBotUserId";
import { useMessageFetcher } from "./useMessageFetcher";
import { useRealtimeMessages } from "./useRealtimeMessages";
import { useSendManualResponse } from "./useSendManualResponse";
import { BotMessageHistoryItem } from "../types";

export const useBotMessageHistory = (botId: string | null, sessionToken: string | null) => {
  const { botUserId, loadingBotUserId, errorBotUserId } = useBotUserId(botId, sessionToken);
  
  const { messages, loadingMessages, errorMessages, fetchMessages, setMessages } = useMessageFetcher(botId, botUserId);

  // Clear messages when botId or sessionToken changes
  useEffect(() => {
    if (!botId || !sessionToken) {
      console.log('[useBotMessageHistory] Clearing messages due to missing botId or sessionToken');
      setMessages([]);
    }
  }, [botId, sessionToken, setMessages]);

  const { realtimeError, isConnected } = useRealtimeMessages(botUserId, fetchMessages);

  const { sendManualResponse } = useSendManualResponse(botId, sessionToken);

  const loading = loadingBotUserId || loadingMessages;
  const error = useMemo(() => {
    const errors = [errorBotUserId, errorMessages, realtimeError].filter(Boolean);
    return errors.length > 0 ? errors.join(', ') : null;
  }, [errorBotUserId, errorMessages, realtimeError]);

  // Debug logging
  useEffect(() => {
    console.log('[useBotMessageHistory] State update:', {
      botId,
      sessionToken,
      botUserId,
      messagesCount: messages.length,
      loading,
      error,
      isConnected
    });
  }, [botId, sessionToken, botUserId, messages.length, loading, error, isConnected]);

  return {
    messages,
    loading,
    error,
    sendManualResponse,
    isConnected
  };
};

export type { BotMessageHistoryItem };
