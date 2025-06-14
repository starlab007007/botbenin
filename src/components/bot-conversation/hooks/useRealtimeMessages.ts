
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useRealtimeMessages = (botUserId: string | null, fetchMessages: () => void) => {
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Stabilize the fetchMessages callback
  const stableFetchMessages = useCallback(() => {
    console.log('[useRealtimeMessages] Triggering message refresh due to real-time event');
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!botUserId) {
      console.log("[useRealtimeMessages] No botUserId provided, skipping subscription");
      setIsConnected(false);
      setRealtimeError(null);
      return;
    }

    const channelName = `messages_${botUserId}`;
    console.log(`[useRealtimeMessages] Subscribing to channel: ${channelName}`);
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: botUserId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `bot_user_id=eq.${botUserId}`
        },
        (payload) => {
          console.log('[useRealtimeMessages] Received real-time event:', payload);
          stableFetchMessages();
        }
      )
      .subscribe((status, err) => {
        console.log(`[useRealtimeMessages] Subscription status: ${status}`, err);
        
        if (status === 'SUBSCRIBED') {
          console.log(`[useRealtimeMessages] Successfully subscribed to ${channelName}`);
          setIsConnected(true);
          setRealtimeError(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[useRealtimeMessages] Channel error for ${channelName}:`, err);
          setIsConnected(false);
          const errorMessage = err?.message || err?.toString() || 'Unknown channel error';
          setRealtimeError(`Channel error: ${errorMessage}`);
        } else if (status === 'TIMED_OUT') {
          console.warn(`[useRealtimeMessages] Subscription timed out for ${channelName}`);
          setIsConnected(false);
          setRealtimeError('Connection timed out');
        } else if (status === 'CLOSED') {
          console.log(`[useRealtimeMessages] Channel closed for ${channelName}`);
          setIsConnected(false);
          setRealtimeError(null);
        }
      });

    return () => {
      console.log(`[useRealtimeMessages] Cleaning up subscription for ${channelName}`);
      setIsConnected(false);
      setRealtimeError(null);
      supabase.removeChannel(channel);
    };
  }, [botUserId, stableFetchMessages]);

  return { realtimeError, isConnected };
};
