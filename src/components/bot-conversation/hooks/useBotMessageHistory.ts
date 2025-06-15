
import { useEffect, useMemo, useState } from "react";
import { useBotUserId } from "./useBotUserId";
import { useMessageFetcher } from "./useMessageFetcher";
import { useRealtimeMessages } from "./useRealtimeMessages";
import { useSendManualResponse } from "./useSendManualResponse";
import { BotMessageHistoryItem } from "../types";

export const useBotMessageHistory = (botId: string | null, sessionToken: string | null) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const { botUserId, loadingBotUserId, errorBotUserId } = useBotUserId(botId, sessionToken);
  
  const { messages, loadingMessages, errorMessages, fetchMessages, setMessages } = useMessageFetcher(botId, botUserId, sessionToken);

  // Clear messages when botId or sessionToken changes and mark as initialized
  useEffect(() => {
    if (!botId || !sessionToken) {
      console.log('[useBotMessageHistory] Clearing messages due to missing botId or sessionToken');
      setMessages([]);
      setHasInitialized(false);
    } else {
      console.log(`[useBotMessageHistory] Initialized for bot ${botId} with session ${sessionToken}`);
      setHasInitialized(true);
    }
  }, [botId, sessionToken, setMessages]);

  const { realtimeError, isConnected } = useRealtimeMessages(botUserId, fetchMessages);

  const { sendManualResponse } = useSendManualResponse(botId, sessionToken);

  // Improved loading logic - prevent infinite loading
  const loading = useMemo(() => {
    // If no botId or sessionToken, no loading needed
    if (!botId || !sessionToken) return false;
    
    // If not initialized yet, we're loading
    if (!hasInitialized) return true;
    
    // If we're loading the bot user ID, we're loading
    if (loadingBotUserId) return true;
    
    // If we're loading messages AND we have essential data, we're loading
    if (loadingMessages && botUserId) return true;
    
    // Sinon, on n'est plus en loading
    return false;
  }, [botId, sessionToken, hasInitialized, loadingBotUserId, loadingMessages, botUserId]);

  const error = useMemo(() => {
    const errors = [errorBotUserId, errorMessages, realtimeError].filter(Boolean);
    return errors.length > 0 ? errors.join(', ') : null;
  }, [errorBotUserId, errorMessages, realtimeError]);

  // Debug logging with throttling to prevent spam
  useEffect(() => {
    const debugData = {
      botId,
      sessionToken: sessionToken ? sessionToken.substring(0, 15) + '...' : null,
      botUserId,
      hasInitialized,
      messagesCount: messages.length,
      loading,
      loadingBotUserId,
      loadingMessages,
      error,
      isConnected
    };
    
    console.log('[useBotMessageHistory] State:', debugData);
  }, [botId, sessionToken, botUserId, hasInitialized, messages.length, loading, loadingBotUserId, loadingMessages, error, isConnected]);

  return {
    messages,
    loading,
    error,
    sendManualResponse,
    isConnected
  };
};

export type { BotMessageHistoryItem };
