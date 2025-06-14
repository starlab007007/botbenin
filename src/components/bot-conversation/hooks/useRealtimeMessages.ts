
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useRealtimeMessages = (botUserId: string | null, fetchMessages: () => void) => {
  const [realtimeError, setRealtimeError] = useState<string | null>(null);

  useEffect(() => {
    if (!botUserId) {
      console.log("useRealtimeMessages: Waiting for botUserId to subscribe to realtime channel.");
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
          setRealtimeError(null);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`Failed to subscribe to ${channelName}`, err);
          const errorMessage = err?.message ?? (err ? JSON.stringify(err) : 'An unknown error occurred');
          setRealtimeError(`Realtime connection failed: ${errorMessage}`);
        }
        if (status === 'TIMED_OUT') {
          console.log(`Subscription to ${channelName} timed out.`);
          setRealtimeError('Realtime connection timed out.');
        }
      });

    return () => {
      console.log(`Unsubscribing from channel: ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [botUserId, fetchMessages]);

  return { realtimeError };
};
