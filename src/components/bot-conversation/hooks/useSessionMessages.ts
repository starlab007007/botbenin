
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { debugSessionTokens } from "@/services/chatService";

interface SessionMessage {
  id: string;
  message_content: string;
  message_type: 'user' | 'bot';
  created_at: string;
  metadata: any;
  bot_user_id: string;
}

export const useSessionMessages = (
  botId: string | null,
  sessionToken: string | null,
  botUserId?: string | null
) => {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugTokens, setDebugTokens] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!botId || !sessionToken) {
      setMessages([]);
      setError(null);
      setDebugTokens(null);
      return;
    }

    setLoading(true);
    setError(null);
    setDebugTokens(null);

    try {
      console.log(`[useSessionMessages] Fetching messages for bot ${botId}, session ${sessionToken}`);
      
      // Appel de debug pour analyser les tokens en base
      await debugSessionTokens(botId);

      // Appel principal avec session_token uniquement
      const { data, error: rpcError } = await supabase.rpc('get_chat_history', {
        p_bot_id: botId,
        p_session_token: sessionToken,
        p_bot_user_id: null,
      });

      if (rpcError) {
        console.error('[useSessionMessages] RPC Error:', rpcError);
        setError(rpcError.message);
        setMessages([]);
      } else if (data && data.length > 0) {
        console.log(`[useSessionMessages] Found ${data.length} messages via RPC`);
        const formattedMessages: SessionMessage[] = data.map((item: any) => ({
          id: item.id,
          message_content: item.message_content,
          message_type: (item.message_type === 'user' || item.message_type === 'bot') ? item.message_type : 'bot',
          created_at: item.created_at,
          metadata: item.metadata,
          bot_user_id: item.bot_user_id,
        }));
        formattedMessages.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(formattedMessages);
      } else {
        console.log('[useSessionMessages] No messages found via RPC');
        setMessages([]);
      }

      // Recherche directe alternative pour debug
      console.log('[useSessionMessages] Recherche directe pour debug...');
      const { data: directMessages } = await supabase
        .from('chat_messages')
        .select(`
          id,
          message_content,
          message_type,
          created_at,
          metadata,
          bot_user_id,
          bot_users!inner(session_id)
        `)
        .eq('bot_id', botId)
        .or(`metadata->>session_token.eq.${sessionToken},bot_users.session_id.eq.${sessionToken}`)
        .order('created_at', { ascending: true });

      if (directMessages && directMessages.length > 0) {
        console.log(`[useSessionMessages] Recherche directe: ${directMessages.length} messages trouvés`);
      }

      // DEBUG : Montre les tokens trouvés dans les derniers messages
      const { data: allRecent } = await supabase
        .from('chat_messages')
        .select('metadata, bot_users!inner(session_id)')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (allRecent) {
        const foundTokens = [
          ...new Set(
            allRecent
              .map(m => {
                const tokens = [];
                if (m.metadata && typeof m.metadata === 'object' && m.metadata !== null) {
                  if ('session_token' in m.metadata) tokens.push(m.metadata.session_token);
                  if ('sessionToken' in m.metadata) tokens.push(m.metadata.sessionToken);
                }
                if (m.bot_users?.session_id) tokens.push(m.bot_users.session_id);
                return tokens;
              })
              .flat()
              .filter(Boolean)
          ),
        ].join(', ');
        setDebugTokens(foundTokens || 'Aucun token trouvé');
        console.log(`[useSessionMessages] Tokens trouvés dans les 10 derniers messages: ${foundTokens}`);
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

  return { messages, loading, error, refetch: fetchMessages, debugTokens };
};
