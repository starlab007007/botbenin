
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BotMessageHistoryItem } from "../types";

export const useMessageFetcher = (botId: string | null, botUserId: string | null) => {
  const [messages, setMessages] = useState<BotMessageHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!botId || !botUserId) {
        setMessages([]);
        return;
    }

    setLoading(true);
    setError(null);
    console.log(`Fetching messages for bot ${botId} and bot_user_id ${botUserId}`);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
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
        `)
        .eq('bot_user_id', botUserId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching chat messages:', error);
        setError(error.message);
        return;
      }
      
      if (!data) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const typedMessages = data.map((msg: any) => ({
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
      })) as BotMessageHistoryItem[];

      setMessages(typedMessages);
    } catch (err) {
      console.error('Error in fetchMessages:', err);
      setError('Failed to fetch message history');
    } finally {
      setLoading(false);
    }
  }, [botId, botUserId]);

  return { messages, loadingMessages: loading, errorMessages: error, fetchMessages, setMessages };
};
