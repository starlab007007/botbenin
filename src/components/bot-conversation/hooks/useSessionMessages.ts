
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
      // Étape 1: Essayer la fonction RPC get_chat_history
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

        formattedMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setMessages(formattedMessages);
        setLoading(false);
        return;
      }

      console.log('[useSessionMessages] RPC returned no data, trying direct approach');

      // Étape 2: Chercher ou créer un bot_user pour cette session
      let botUserId: string | null = null;

      // Chercher un bot_user existant
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
        botUserId = botUserData.id;
        console.log(`[useSessionMessages] Found existing bot_user: ${botUserId}`);
      } else {
        // Créer un nouveau bot_user pour cette session anonyme
        console.log(`[useSessionMessages] Creating new bot_user for session: ${sessionToken}`);
        
        const { data: newBotUser, error: createError } = await supabase
          .from('bot_users')
          .insert({
            bot_id: botId,
            session_id: sessionToken,
            user_name: `Anonymous User ${sessionToken.slice(-8)}`,
            is_authenticated: false
          })
          .select('id')
          .single();

        if (createError) {
          console.error('[useSessionMessages] Error creating bot_user:', createError);
          throw createError;
        }

        if (newBotUser?.id) {
          botUserId = newBotUser.id;
          console.log(`[useSessionMessages] Created new bot_user: ${botUserId}`);
        }
      }

      // Étape 3: Récupérer les messages avec le bot_user_id
      if (botUserId) {
        const { data: directData, error: directError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('bot_id', botId)
          .eq('bot_user_id', botUserId)
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
        console.log('[useSessionMessages] No bot_user found or created');
        setMessages([]);
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
