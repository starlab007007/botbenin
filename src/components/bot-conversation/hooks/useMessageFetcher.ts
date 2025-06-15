
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BotMessageHistoryItem } from "../types";

const mapRawMessagesToTyped = (data: any[]): BotMessageHistoryItem[] => {
  if (!data) return [];
  return data.map((msg: any) => ({
    message_id: msg.id,
    bot_id: msg.bot_id,
    bot_user_id: msg.bot_user_id,
    message_content: msg.message_content,
    message_type: msg.message_type as 'user' | 'bot',
    message_timestamp: msg.created_at,
    ip_address: msg.ip_address,
    user_agent: msg.user_agent,
    metadata: msg.metadata,
    user_name: msg.bot_users?.user_name,
    user_email: msg.bot_users?.user_email,
    session_id: msg.bot_users?.session_id,
    user_first_seen: msg.bot_users?.created_at,
    user_last_active: msg.bot_users?.last_active,
    bot_name: msg.bots?.name,
    owner_id: msg.bots?.owner_id,
  }));
};

export const useMessageFetcher = (botId: string | null, botUserId: string | null, sessionToken: string | null) => {
  const [messages, setMessages] = useState<BotMessageHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!botId || (!botUserId && !sessionToken)) {
      console.log('[useMessageFetcher] Missing botId or identifiers, clearing messages');
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`[useMessageFetcher] Fetching messages for bot ${botId}, user ${botUserId}, session ${sessionToken}`);

    const selectQuery = `
      id,
      bot_id,
      bot_user_id,
      created_at,
      message_content,
      message_type,
      ip_address,
      user_agent,
      metadata,
      bot_users (
        user_name,
        user_email,
        session_id,
        created_at,
        last_active
      ),
      bots (
        name,
        owner_id
      )
    `;

    try {
      let allMessages: BotMessageHistoryItem[] = [];

      // Strategy 1: Fetch by bot_user_id (most reliable)
      if (botUserId) {
        console.log(`[useMessageFetcher] Strategy 1: Fetching by bot_user_id ${botUserId}`);
        const { data, error: fetchError } = await supabase
          .from('chat_messages')
          .select(selectQuery)
          .eq('bot_user_id', botUserId);

        if (fetchError) {
          console.error('[useMessageFetcher] S1 Error fetching by bot_user_id:', fetchError);
          setError(prev => (prev ? `${prev}, S1: ${fetchError.message}` : `S1: ${fetchError.message}`));
        } else if (data) {
          console.log(`[useMessageFetcher] S1 Found ${data.length} messages`);
          allMessages.push(...mapRawMessagesToTyped(data));
        }
      }

      // Strategy 2: Fetch by session_token in metadata (fallback)
      if (sessionToken) {
        console.log(`[useMessageFetcher] Strategy 2: Fetching by session_token ${sessionToken}`);
        const { data, error: fetchError } = await supabase
          .from('chat_messages')
          .select(selectQuery)
          .eq('metadata->>session_token', sessionToken)
          .eq('bot_id', botId!);

        if (fetchError) {
          console.error('[useMessageFetcher] S2 Error fetching by session_token metadata:', fetchError);
          if (!fetchError.message.includes('operator does not exist')) {
            setError(prev => (prev ? `${prev}, S2: ${fetchError.message}` : `S2: ${fetchError.message}`));
          }
        } else if (data) {
          console.log(`[useMessageFetcher] S2 Found ${data.length} messages`);
          allMessages.push(...mapRawMessagesToTyped(data));
        }
      }

      if (allMessages.length > 0) {
        const uniqueMessages = Array.from(new Map(allMessages.map(item => [item.message_id, item])).values());
        uniqueMessages.sort((a, b) => new Date(a.message_timestamp).getTime() - new Date(b.message_timestamp).getTime());

        console.log(`[useMessageFetcher] Successfully set ${uniqueMessages.length} unique messages`);
        setMessages(uniqueMessages);
      } else {
        console.log('[useMessageFetcher] No messages found with any strategy.');
        setMessages([]);
      }
    } catch (err: any) {
      console.error('[useMessageFetcher] Error in fetchMessages:', err);
      setError('Failed to fetch message history');
    } finally {
      setLoading(false);
    }
  }, [botId, botUserId, sessionToken]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { messages, loadingMessages: loading, errorMessages: error, fetchMessages, setMessages };
};
