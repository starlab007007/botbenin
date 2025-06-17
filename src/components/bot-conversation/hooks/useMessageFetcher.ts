
import { useState, useCallback, useEffect, useRef } from "react";
import { getChatHistory } from "@/services/chat";
import { BotMessageHistoryItem } from "../types";

const mapRawMessagesToTyped = (data: any[]): BotMessageHistoryItem[] => {
  if (!data) return [];
  return data.map((msg: any) => ({
    message_id: msg.message_id || msg.id,
    bot_id: msg.bot_id,
    bot_user_id: msg.bot_user_id,
    message_content: msg.message_content,
    message_type: msg.message_type as 'user' | 'bot',
    message_timestamp: msg.message_timestamp || msg.created_at,
    ip_address: msg.ip_address,
    user_agent: msg.user_agent,
    metadata: msg.metadata,
    user_name: msg.user_name,
    user_email: msg.user_email,
    session_id: msg.session_id,
    user_first_seen: msg.user_first_seen,
    user_last_active: msg.user_last_active,
    bot_name: msg.bot_name,
    owner_id: msg.owner_id,
  }));
};

export const useMessageFetcher = (botId: string | null, botUserId: string | null, sessionToken: string | null) => {
  const [messages, setMessages] = useState<BotMessageHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Protection against multiple calls
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!botId || !sessionToken) {
      console.log('[useMessageFetcher] Missing botId or sessionToken, clearing messages');
      setMessages([]);
      setError(null);
      return;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Prevent multiple simultaneous calls
    if (fetchingRef.current) {
      console.log('[useMessageFetcher] Fetch already in progress, skipping');
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();

    console.log(`[useMessageFetcher] === ROBUST MESSAGE FETCHING ===`);
    console.log(`[useMessageFetcher] Bot: ${botId}, Session: ${sessionToken}`);

    try {
      // Use robust getChatHistory function
      const data = await getChatHistory(botId, sessionToken);

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('[useMessageFetcher] Request was aborted');
        return;
      }

      if (data && data.length > 0) {
        const allMessages = mapRawMessagesToTyped(data);
        
        // Remove duplicates by message_id
        const uniqueMessages = Array.from(
          new Map(allMessages.map(item => [item.message_id, item])).values()
        );
        
        // Sort by timestamp
        uniqueMessages.sort(
          (a, b) => new Date(a.message_timestamp).getTime() - new Date(b.message_timestamp).getTime()
        );

        console.log(`[useMessageFetcher] Robust system processed ${uniqueMessages.length} unique messages`);
        setMessages(uniqueMessages);
        setError(null);
      } else {
        console.log('[useMessageFetcher] No messages found in robust system');
        setMessages([]);
        setError(null);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[useMessageFetcher] Request was aborted');
        return;
      }
      
      console.error('[useMessageFetcher] Robust system exception:', err);
      setError('Failed to fetch message history from robust system');
      setMessages([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [botId, sessionToken]);

  useEffect(() => {
    fetchMessages();
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchingRef.current = false;
    };
  }, [fetchMessages]);

  // Force refresh function
  const refreshMessages = useCallback(() => {
    fetchingRef.current = false;
    fetchMessages();
  }, [fetchMessages]);

  return { 
    messages, 
    loadingMessages: loading, 
    errorMessages: error, 
    fetchMessages: refreshMessages, 
    setMessages 
  };
};
