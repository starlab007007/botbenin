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
      const orFilters = [];
      if (botUserId) {
        orFilters.push(`bot_user_id.eq.${botUserId}`);
      }
      if (sessionToken) {
        orFilters.push(`metadata->>session_token.eq.${sessionToken}`);
      }

      if (orFilters.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }
      
      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select(selectQuery)
        .eq('bot_id', botId!)
        .or(orFilters.join(','));

      if (fetchError) {
        console.error('[useMessageFetcher] Error fetching messages:', fetchError);
        setError(fetchError.message);
        setMessages([]);
      } else if (data && data.length > 0) {
        const allMessages = mapRawMessagesToTyped(data);
        const uniqueMessages = Array.from(new Map(allMessages.map(item => [item.message_id, item])).values());
        uniqueMessages.sort((a, b) => new Date(a.message_timestamp).getTime() - new Date(b.message_timestamp).getTime());

        console.log(`[useMessageFetcher] Successfully set ${uniqueMessages.length} unique messages`);
        setMessages(uniqueMessages);
      } else {
        console.log('[useMessageFetcher] No messages found.');
        setMessages([]);
      }
    } catch (err: any) {
      console.error('[useMessageFetcher] Exception in fetchMessages:', err);
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
