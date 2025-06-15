
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

export const useSessionMessages = (botId: string | null, sessionToken: string | null) => {
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
      // Méthode 1: Utiliser la fonction RPC si disponible
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_chat_history', {
        p_bot_id: botId,
        p_session_token: sessionToken
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log(`[useSessionMessages] Found ${rpcData.length} messages via RPC`);
        const formattedMessages: SessionMessage[] = rpcData.map((item: any) => ({
          id: item.id,
          message_content: item.message_content,
          message_type: (item.message_type === 'user' || item.message_type === 'bot') ? item.message_type : 'bot',
          created_at: item.created_at,
          metadata: item.metadata,
          bot_user_id: item.bot_user_id
        }));
        setMessages(formattedMessages);
        setLoading(false);
        return;
      }

      // Méthode 2: Requête directe si RPC échoue
      console.log('[useSessionMessages] RPC failed, trying direct query');
      
      // D'abord, trouver le bot_user_id pour cette session
      const { data: botUserData, error: botUserError } = await supabase
        .from('bot_users')
        .select('id')
        .eq('bot_id', botId)
        .eq('session_id', sessionToken)
        .maybeSingle();

      if (botUserError) {
        console.error('[useSessionMessages] Error finding bot user:', botUserError);
      }

      // Requête pour les messages via metadata session_token ou bot_user_id
      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('bot_id', botId)
        .order('created_at', { ascending: true });

      if (botUserData?.id) {
        console.log(`[useSessionMessages] Filtering by bot_user_id: ${botUserData.id}`);
        query = query.eq('bot_user_id', botUserData.id);
      } else {
        console.log(`[useSessionMessages] Filtering by session_token in metadata`);
        query = query.filter('metadata->>session_token', 'eq', sessionToken);
      }

      const { data: directData, error: directError } = await query;

      if (directError) {
        console.error('[useSessionMessages] Direct query error:', directError);
        setError(directError.message);
        setMessages([]);
      } else {
        console.log(`[useSessionMessages] Found ${directData?.length || 0} messages via direct query`);
        // Type-safe mapping of the direct data
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

    } catch (err: any) {
      console.error('[useSessionMessages] Exception:', err);
      setError(err.message || 'Failed to fetch messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [botId, sessionToken]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { messages, loading, error, refetch: fetchMessages };
};
