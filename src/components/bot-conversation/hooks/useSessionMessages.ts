
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
      return;
    }

    setLoading(true);
    setError(null);
    setDebugTokens(null);

    try {
      // Forcer la requête par session_token uniquement
      const { data, error: rpcError } = await supabase.rpc('get_chat_history', {
        p_bot_id: botId,
        p_session_token: sessionToken,
        p_bot_user_id: null,
      });

      if (rpcError) {
        setError(rpcError.message);
        setMessages([]);
      } else if (data && data.length > 0) {
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
        setMessages([]);
      }

      // DEBUG : Montre les tokens trouvés dans les 10 derniers messages (keys session_token ou sessionToken)
      const { data: allRecent } = await supabase
        .from('chat_messages')
        .select('metadata')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (allRecent) {
        const foundTokens = [
          ...new Set(
            allRecent
              .map(m => {
                let s: any = undefined;
                if (m.metadata && typeof m.metadata === 'object' && m.metadata !== null) {
                  if ('session_token' in m.metadata) s = m.metadata.session_token;
                  else if ('sessionToken' in m.metadata) s = m.metadata.sessionToken;
                }
                return s;
              })
              .filter(Boolean)
          ),
        ].join(', ');
        setDebugTokens(foundTokens);
      }
    } catch (err: any) {
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
