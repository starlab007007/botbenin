
import { useEffect, useMemo, useState, useCallback } from "react";
import { useBotUserId } from "./useBotUserId";
import { useMessageFetcher } from "./useMessageFetcher";
import { useRealtimeMessages } from "./useRealtimeMessages";
import { useSendManualResponse } from "./useSendManualResponse";
import { testEnhancedMessageRetrieval, debugSessionTokens } from "@/services/chat";
import { BotMessageHistoryItem } from "../types";

export const useBotMessageHistory = (botId: string | null, sessionToken: string | null) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const { botUserId, loadingBotUserId, errorBotUserId } = useBotUserId(botId, sessionToken);
  const { messages, loadingMessages, errorMessages, fetchMessages, setMessages } = useMessageFetcher(botId, botUserId, sessionToken);

  // Enhanced initialization with unified system
  useEffect(() => {
    if (!botId || !sessionToken) {
      console.log('[useBotMessageHistory] Clearing messages due to missing parameters');
      setMessages([]);
      setHasInitialized(false);
      setDebugInfo('Waiting for bot ID and session token...');
      return;
    }

    console.log(`[useBotMessageHistory] === UNIFIED SYSTEM INITIALIZATION ===`);
    console.log(`[useBotMessageHistory] Bot: ${botId}, Session: ${sessionToken}`);
    setHasInitialized(true);
    setDebugInfo(`Unified system initialized for bot ${botId.slice(0, 8)}... with session ${sessionToken.slice(0, 15)}...`);
    
    // Enhanced debugging for anonymous sessions
    if (sessionToken.startsWith('anon_')) {
      console.log(`[useBotMessageHistory] === UNIFIED SYSTEM DEBUGGING ===`);
      
      // Debug session tokens with unified system
      debugSessionTokens(botId).then(() => {
        console.log(`[useBotMessageHistory] Unified debug completed`);
        setDebugInfo(prev => prev + ' | Unified debug completed');
      }).catch(err => {
        console.warn('[useBotMessageHistory] Unified debug failed:', err);
        setDebugInfo(prev => prev + ' | Unified debug failed');
      });

      // Enhanced test retrieval
      const testTimer = setTimeout(() => {
        testEnhancedMessageRetrieval(botId, sessionToken).then((results) => {
          console.log(`[useBotMessageHistory] Enhanced test results:`, results);
          const resultSummary = results 
            ? `Unified RPC: ${results.unifiedRpc?.count || 0}, View: ${results.directView?.count || 0}`
            : 'failed';
          setDebugInfo(prev => prev + ` | Enhanced test: ${resultSummary}`);
        }).catch(err => {
          console.warn('[useBotMessageHistory] Enhanced test failed:', err);
          setDebugInfo(prev => prev + ' | Enhanced test failed');
        });
      }, 2000);

      return () => clearTimeout(testTimer);
    }
  }, [botId, sessionToken, setMessages]);

  // Configure realtime with unified system
  const { realtimeError, isConnected } = useRealtimeMessages(botUserId, fetchMessages);
  const { sendManualResponse } = useSendManualResponse(botId, sessionToken);

  // Enhanced loading logic
  const loading = useMemo(() => {
    if (!botId || !sessionToken) return false;
    if (!hasInitialized) return true;
    if (loadingBotUserId) return true;
    if (loadingMessages && messages.length === 0 && !errorMessages) return true;
    return false;
  }, [botId, sessionToken, hasInitialized, loadingBotUserId, loadingMessages, messages.length, errorMessages]);

  // Enhanced error handling
  const error = useMemo(() => {
    const errors = [errorBotUserId, errorMessages, realtimeError].filter(Boolean);
    return errors.length > 0 ? errors.join(', ') : null;
  }, [errorBotUserId, errorMessages, realtimeError]);

  // Manual refresh function
  const refreshData = useCallback(() => {
    console.log('[useBotMessageHistory] Manual refresh requested (unified system)');
    setDebugInfo(prev => prev + ' | Manual refresh (unified)');
    fetchMessages();
  }, [fetchMessages]);

  // Enhanced debug logging
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
      debugInfo,
      system: 'unified'
    };
    
    console.log('[useBotMessageHistory] Unified system state:', debugData);
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
