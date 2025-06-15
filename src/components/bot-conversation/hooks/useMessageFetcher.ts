
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getChatHistory } from "@/services/chatService";
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

  const fetchMessages = useCallback(async () => {
    if (!botId || !sessionToken) {
      console.log('[useMessageFetcher] Missing botId or sessionToken, clearing messages');
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`[useMessageFetcher] Fetching messages with enhanced retrieval for bot ${botId}, session ${sessionToken}`);

    try {
      // Utiliser la nouvelle fonction getChatHistory améliorée
      const data = await getChatHistory(botId, sessionToken);

      if (data && data.length > 0) {
        const allMessages = mapRawMessagesToTyped(data);
        const uniqueMessages = Array.from(new Map(allMessages.map(item => [item.message_id, item])).values());
        uniqueMessages.sort((a, b) => new Date(a.message_timestamp).getTime() - new Date(b.message_timestamp).getTime());

        console.log(`[useMessageFetcher] Successfully set ${uniqueMessages.length} unique messages via enhanced retrieval`);
        setMessages(uniqueMessages);
      } else {
        console.log('[useMessageFetcher] No messages found via enhanced retrieval.');
        setMessages([]);
      }
    } catch (err: any) {
      console.error('[useMessageFetcher] Exception in fetchMessages (Enhanced):', err);
      setError('Failed to fetch message history');
    } finally {
      setLoading(false);
    }
  }, [botId, sessionToken]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { messages, loadingMessages: loading, errorMessages: error, fetchMessages, setMessages };
};
