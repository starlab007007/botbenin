
import { useEffect, useMemo, useState, useCallback } from "react";
import { useBotUserId } from "./useBotUserId";
import { useMessageFetcher } from "./useMessageFetcher";
import { useRealtimeMessages } from "./useRealtimeMessages";
import { useSendManualResponse } from "./useSendManualResponse";
import { testMessageRetrieval, debugSessionTokens } from "@/services/chat";
import { BotMessageHistoryItem } from "../types";

export const useBotMessageHistory = (botId: string | null, sessionToken: string | null) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const { botUserId, loadingBotUserId, errorBotUserId } = useBotUserId(botId, sessionToken);
  const { messages, loadingMessages, errorMessages, fetchMessages, setMessages } = useMessageFetcher(botId, botUserId, sessionToken);

  // Debug et initialisation améliorés
  useEffect(() => {
    if (!botId || !sessionToken) {
      console.log('[useBotMessageHistory] Clearing messages due to missing parameters');
      setMessages([]);
      setHasInitialized(false);
      setDebugInfo('Waiting for bot ID and session token...');
      return;
    }

    console.log(`[useBotMessageHistory] === INITIALIZATION ===`);
    console.log(`[useBotMessageHistory] Bot: ${botId}, Session: ${sessionToken}`);
    setHasInitialized(true);
    setDebugInfo(`Initialized for bot ${botId.slice(0, 8)}... with session ${sessionToken.slice(0, 15)}...`);
    
    // Debug en arrière-plan pour les sessions anonymes
    if (sessionToken.startsWith('anon_')) {
      console.log(`[useBotMessageHistory] === ENHANCED DEBUGGING ===`);
      
      // Debug des tokens de session
      debugSessionTokens(botId).then(() => {
        console.log(`[useBotMessageHistory] Session debug completed`);
        setDebugInfo(prev => prev + ' | Session debug completed');
      }).catch(err => {
        console.warn('[useBotMessageHistory] Session debug failed:', err);
        setDebugInfo(prev => prev + ' | Session debug failed');
      });

      // Test de récupération différé
      const testTimer = setTimeout(() => {
        testMessageRetrieval(botId, sessionToken).then((results) => {
          console.log(`[useBotMessageHistory] Test retrieval results:`, results);
          setDebugInfo(prev => prev + ` | Test result: ${results ? 'success' : 'failed'}`);
        }).catch(err => {
          console.warn('[useBotMessageHistory] Test retrieval failed:', err);
          setDebugInfo(prev => prev + ' | Test retrieval failed');
        });
      }, 2000);

      return () => clearTimeout(testTimer);
    }
  }, [botId, sessionToken, setMessages]);

  // Configuration du realtime
  const { realtimeError, isConnected } = useRealtimeMessages(botUserId, fetchMessages);
  const { sendManualResponse } = useSendManualResponse(botId, sessionToken);

  // Logique de chargement améliorée
  const loading = useMemo(() => {
    if (!botId || !sessionToken) return false;
    if (!hasInitialized) return true;
    if (loadingBotUserId) return true;
    if (loadingMessages && messages.length === 0 && !errorMessages) return true;
    return false;
  }, [botId, sessionToken, hasInitialized, loadingBotUserId, loadingMessages, messages.length, errorMessages]);

  // Gestion d'erreur améliorée
  const error = useMemo(() => {
    const errors = [errorBotUserId, errorMessages, realtimeError].filter(Boolean);
    return errors.length > 0 ? errors.join(', ') : null;
  }, [errorBotUserId, errorMessages, realtimeError]);

  // Fonction de refresh manuel
  const refreshData = useCallback(() => {
    console.log('[useBotMessageHistory] Manual refresh requested');
    setDebugInfo(prev => prev + ' | Manual refresh');
    fetchMessages();
  }, [fetchMessages]);

  // Logging debug throttlé
  useEffect(() => {
    const debugData = {
      botId: botId ? botId.slice(0, 8) + '...' : null,
      sessionToken: sessionToken ? sessionToken.slice(0, 15) + '...' : null,
      botUserId: botUserId ? botUserId.slice(0, 8) + '...' : null,
      hasInitialized,
      messagesCount: messages.length,
      loading,
      error: !!error,
      isConnected,
      debugInfo
    };
    
    console.log('[useBotMessageHistory] Current state:', debugData);
  }, [botId, sessionToken, botUserId, hasInitialized, messages.length, loading, error, isConnected, debugInfo]);

  return {
    messages,
    loading,
    error,
    sendManualResponse,
    isConnected,
    debugInfo,
    refreshData
  };
};

export type { BotMessageHistoryItem };
