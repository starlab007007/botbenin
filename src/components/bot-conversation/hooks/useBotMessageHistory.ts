import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BotMessageHistoryItem {
  message_id: string;
  bot_id: string;
  bot_user_id: string;
  message_content: string;
  message_type: 'user' | 'bot';
  message_timestamp: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  user_name?: string;
  user_email?: string;
  session_id?: string;
  user_first_seen?: string;
  user_last_active?: string;
  bot_name: string;
  owner_id: string;
}

export const useBotMessageHistory = (botId: string | null, sessionToken: string | null) => {
  const [messages, setMessages] = useState<BotMessageHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botUserId, setBotUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBotUserId = async () => {
      if (!botId || !sessionToken) {
        setBotUserId(null);
        return;
      }
      console.log(`Fetching bot_user_id for bot ${botId} and session ${sessionToken}`);
      const { data, error } = await supabase
        .from('bot_users')
        .select('id')
        .eq('bot_id', botId)
        .eq('session_id', sessionToken)
        .single();

      if (error) {
        console.error('Error fetching bot_user_id:', error);
      } else if (data) {
        console.log('Fetched bot_user_id:', data.id);
        setBotUserId(data.id);
      } else {
        setBotUserId(null);
      }
    };

    fetchBotUserId();
  }, [botId, sessionToken]);

  const fetchMessages = useCallback(async () => {
    if (!botId || !botUserId) return;

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
      
      console.log('Fetched raw messages:', data);

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

  useEffect(() => {
    if (!botId || !sessionToken) {
      setMessages([]);
      return;
    }

    fetchMessages();

    if (!botUserId) {
      console.log("Waiting for botUserId to subscribe to realtime channel.");
      return;
    }

    const channelName = `chat-channel-for-user:${botUserId}`;
    console.log(`Subscribing to real-time channel: ${channelName} with bot_user_id: ${botUserId}`);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `bot_user_id=eq.${botUserId}`
        },
        (payload) => {
          console.log('Real-time: chat_messages change received!', payload);
          fetchMessages();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${channelName}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`Failed to subscribe to ${channelName}`, err);
          const errorMessage = err?.message ?? (err ? JSON.stringify(err) : 'An unknown error occurred');
          setError(`Realtime connection failed: ${errorMessage}`);
        }
        if (status === 'TIMED_OUT') {
          console.log(`Subscription to ${channelName} timed out.`);
          setError('Realtime connection timed out.');
        }
      });

    return () => {
      console.log(`Unsubscribing from channel: ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [botId, sessionToken, fetchMessages, botUserId]);

  const sendManualResponse = async (messageContent: string) => {
    if (!botId || !sessionToken) {
      throw new Error('Bot ID and session token are required');
    }
    console.log(`Sending manual response for bot ${botId}, session ${sessionToken}`);

    try {
      const { data, error } = await supabase.rpc('send_manual_bot_response', {
        p_bot_id: botId,
        p_session_token: sessionToken,
        p_message_content: messageContent
      });

      if (error) {
        console.error('Error sending manual response:', error);
        throw new Error(error.message);
      }

      console.log('Manual response sent successfully', data);
      return data;
    } catch (err) {
      console.error('Error in sendManualResponse:', err);
      throw err;
    }
  };

  return {
    messages,
    loading,
    error,
    sendManualResponse
  };
};
