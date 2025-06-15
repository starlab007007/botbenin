
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SessionMessage {
  id: string;
  message_content: string;
  message_type: 'user' | 'bot';
  created_at: string;
  metadata: any;
  bot_user_id: string;
}

export const useSessionMessages = (botId: string | null, sessionToken: string | null, botUserId?: string | null) => {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!botId || !sessionToken) {
      console.log('[useSessionMessages] Missing botId or sessionToken');
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`[useSessionMessages] Fetching messages for bot ${botId}, session ${sessionToken}`);

    try {
      // Always use the corrected RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_chat_history', {
        p_bot_id: botId,
        p_bot_user_id: botUserId || null,
        p_session_token: sessionToken
      });

      if (rpcError) {
        console.error('[useSessionMessages] RPC error:', rpcError);
      }

      if (rpcData && rpcData.length > 0) {
        console.log(`[useSessionMessages] Found ${rpcData.length} messages via RPC`);
        const formattedMessages: SessionMessage[] = rpcData.map((item: any) => ({
          id: item.id,
          message_content: item.message_content,
          message_type: (item.message_type === 'user' || item.message_type === 'bot') ? item.message_type : 'bot',
          created_at: item.created_at,
          metadata: item.metadata,
          bot_user_id: item.bot_user_id
        }));

        formattedMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setMessages(formattedMessages);
        setLoading(false);
        return;
      }

      // Fallback: direct manual fetch for rare edge cases
      console.log('[useSessionMessages] RPC returned no data, trying direct approach');
      let resolvedBotUserId: string | null = botUserId || null;

      if (!resolvedBotUserId) {
        const { data: botUserData, error: botUserError } = await supabase
          .from('bot_users')
          .select('id')
          .eq('bot_id', botId)
          .eq('session_id', sessionToken)
          .maybeSingle();

        if (botUserError) {
          console.error('[useSessionMessages] Error finding bot user:', botUserError);
        }

        if (botUserData?.id) {
          resolvedBotUserId = botUserData.id;
          console.log(`[useSessionMessages] Found existing bot_user: ${resolvedBotUserId}`);
        }
      }

      if (resolvedBotUserId) {
        const { data: directData, error: directError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('bot_id', botId)
          .eq('bot_user_id', resolvedBotUserId)
          .order('created_at', { ascending: true });

        if (directError) {
          console.error('[useSessionMessages] Direct query error:', directError);
          setError(directError.message);
          setMessages([]);
        } else {
          console.log(`[useSessionMessages] Found ${directData?.length || 0} messages via direct query`);
          const typedMessages: SessionMessage[] = (directData || []).map((item: any) => ({
            id: item.id,
            message_content: item.message_content,
            message_type: (item.message_type === 'user' || item.message_type === 'bot') ? item.message_type : 'bot',
            created_at: item.created_at,
            metadata: item.metadata,
            bot_user_id: item.bot_user_id
          }));
          setMessages(typedMessages);
        }
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      console.error('[useSessionMessages] Exception:', err);
      setError(err.message || 'Failed to fetch messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [botId, sessionToken, botUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { messages, loading, error, refetch: fetchMessages };
};
