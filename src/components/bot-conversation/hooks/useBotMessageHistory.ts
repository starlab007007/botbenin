
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

  const fetchMessages = useCallback(async () => {
    if (!botId || !sessionToken) return;

    setLoading(true);
    setError(null);
    console.log(`Fetching messages for bot ${botId} and session ${sessionToken}`);

    try {
      const { data, error } = await supabase
        .from('bot_message_history')
        .select('*')
        .eq('bot_id', botId)
        .eq('session_id', sessionToken)
        .order('message_timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching bot message history:', error);
        setError(error.message);
        return;
      }
      
      console.log('Fetched messages:', data);

      // Type assertion to ensure message_type is properly typed
      const typedMessages = (data || []).map(msg => ({
        ...msg,
        message_type: msg.message_type as 'user' | 'bot'
      })) as BotMessageHistoryItem[];

      setMessages(typedMessages);
    } catch (err) {
      console.error('Error in fetchMessages:', err);
      setError('Failed to fetch message history');
    } finally {
      setLoading(false);
    }
  }, [botId, sessionToken]);

  useEffect(() => {
    if (!botId || !sessionToken) {
      setMessages([]);
      return;
    }

    fetchMessages();

    const channelName = `bot-session-${botId}-${sessionToken}`;
    console.log(`Subscribing to real-time channel: ${channelName}`);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `bot_id=eq.${botId}`
        },
        (payload) => {
          console.log('Real-time: chat_messages change received!', payload);
          fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bot_users',
          filter: `bot_id=eq.${botId}`
        },
        (payload) => {
          console.log('Real-time: bot_users change received!', payload);
          fetchMessages();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${channelName}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`Failed to subscribe to ${channelName}`, err);
          setError(`Realtime connection failed: ${err?.message}`);
        }
      });

    return () => {
      console.log(`Unsubscribing from channel: ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [botId, sessionToken, fetchMessages]);

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

