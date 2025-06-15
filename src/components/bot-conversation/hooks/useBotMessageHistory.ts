
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

  // Clear messages when botId or sessionToken changes
  useEffect(() => {
    if (!botId || !sessionToken) {
      console.log('[useBotMessageHistory] Clearing messages due to missing botId or sessionToken');
      setMessages([]);
      setHasInitialized(false);
    } else {
      setHasInitialized(true);
    }
  }, [botId, sessionToken, setMessages]);

  const { realtimeError, isConnected } = useRealtimeMessages(botUserId, fetchMessages);

  const { sendManualResponse } = useSendManualResponse(botId, sessionToken);

  // Améliorer la logique de loading - ne pas rester en loading indéfiniment
  const loading = useMemo(() => {
    // Si pas de botId ou sessionToken, pas de loading
    if (!botId || !sessionToken) return false;
    
    // Si on n'a pas encore initialisé, on est en loading
    if (!hasInitialized) return true;
    
    // Si on charge le bot user ID, on est en loading
    if (loadingBotUserId) return true;
    
    // Si on charge les messages ET qu'on a un botUserId, on est en loading
    if (loadingMessages && botUserId) return true;
    
    // Sinon, on n'est plus en loading
    return false;
  }, [botId, sessionToken, hasInitialized, loadingBotUserId, loadingMessages, botUserId]);

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
      hasInitialized,
      messagesCount: messages.length,
      loading,
      loadingBotUserId,
      loadingMessages,
      error,
      isConnected
    });
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
