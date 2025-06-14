
import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!botId || !sessionToken) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      setError(null);

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

        setMessages(data || []);
      } catch (err) {
        console.error('Error in fetchMessages:', err);
        setError('Failed to fetch message history');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('bot_message_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `bot_id=eq.${botId}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [botId, sessionToken]);

  const sendManualResponse = async (messageContent: string) => {
    if (!botId || !sessionToken) {
      throw new Error('Bot ID and session token are required');
    }

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
