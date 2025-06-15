import { useState, useEffect, useCallback } from "react";
import { getChatHistory, debugSessionTokens } from "@/services/chat";

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
      console.log(`[useSessionMessages] Fetching messages with enhanced retrieval for bot ${botId}, session ${sessionToken}`);
      
      // Appel de debug pour analyser les tokens en base
      await debugSessionTokens(botId);

      // Utiliser la nouvelle fonction getChatHistory améliorée
      const data = await getChatHistory(botId, sessionToken);

      if (data && data.length > 0) {
        console.log(`[useSessionMessages] Found ${data.length} messages via enhanced retrieval`);
        const formattedMessages: SessionMessage[] = data.map((item: any) => ({
          id: item.message_id || item.id,
          message_content: item.message_content,
          message_type: (item.message_type === 'user' || item.message_type === 'bot') ? item.message_type : 'bot',
          created_at: item.message_timestamp || item.created_at,
          metadata: item.metadata,
          bot_user_id: item.bot_user_id,
        }));
        formattedMessages.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(formattedMessages);
      } else {
        console.log('[useSessionMessages] No messages found via enhanced retrieval');
        setMessages([]);
      }

      // Définir les tokens trouvés pour le debug
      setDebugTokens('Enhanced retrieval system active');

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
