
import { useState, useEffect, useCallback, useRef } from "react";
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
  
  // Ref pour éviter les appels en double
  const fetchingRef = useRef(false);
  const lastFetchParams = useRef<string>('');

  const fetchMessages = useCallback(async () => {
    if (!botId || !sessionToken) {
      setMessages([]);
      setError(null);
      setDebugTokens(null);
      return;
    }

    // Créer une clé unique pour cette requête
    const currentParams = `${botId}-${sessionToken}`;
    
    // Éviter les appels duplicatas
    if (fetchingRef.current && lastFetchParams.current === currentParams) {
      console.log('[useSessionMessages] Skipping duplicate fetch request');
      return;
    }

    fetchingRef.current = true;
    lastFetchParams.current = currentParams;
    
    setLoading(true);
    setError(null);
    setDebugTokens(null);

    try {
      console.log(`[useSessionMessages] === ENHANCED MESSAGE FETCH ===`);
      console.log(`[useSessionMessages] Bot: ${botId}, Session: ${sessionToken}`);
      
      // Debug des tokens en parallèle (non bloquant)
      debugSessionTokens(botId).catch(err => {
        console.warn('[useSessionMessages] Debug tokens failed:', err);
      });

      // Récupération principale avec la fonction améliorée
      const data = await getChatHistory(botId, sessionToken);

      if (data && data.length > 0) {
        console.log(`[useSessionMessages] Successfully retrieved ${data.length} messages`);
        
        const formattedMessages: SessionMessage[] = data.map((item: any) => ({
          id: item.message_id || item.id,
          message_content: item.message_content,
          message_type: (item.message_type === 'user' || item.message_type === 'bot') ? item.message_type : 'bot',
          created_at: item.message_timestamp || item.created_at,
          metadata: item.metadata,
          bot_user_id: item.bot_user_id,
        }));

        // Trier par timestamp
        formattedMessages.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        setMessages(formattedMessages);
        setDebugTokens(`Retrieved ${formattedMessages.length} messages with enhanced system`);
      } else {
        console.log('[useSessionMessages] No messages found');
        setMessages([]);
        setDebugTokens('No messages found - session may be new');
      }

    } catch (err: any) {
      console.error('[useSessionMessages] Exception:', err);
      setError(err.message || 'Failed to fetch messages');
      setMessages([]);
      setDebugTokens('Error occurred during message fetch');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [botId, sessionToken]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Fonction pour forcer un refresh
  const refreshMessages = useCallback(() => {
    fetchingRef.current = false;
    lastFetchParams.current = '';
    fetchMessages();
  }, [fetchMessages]);

  return { 
    messages, 
    loading, 
    error, 
    refetch: refreshMessages, 
    debugTokens 
  };
};
