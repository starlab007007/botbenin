
import { useState, useEffect, useCallback, useRef } from "react";
import { getChatHistory } from "@/services/chat";

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
  
  // Ref to prevent duplicate calls
  const fetchingRef = useRef(false);
  const lastFetchParams = useRef<string>('');

  const fetchMessages = useCallback(async () => {
    if (!botId || !sessionToken) {
      setMessages([]);
      setError(null);
      return;
    }

    // Create unique key for this request
    const currentParams = `${botId}-${sessionToken}`;
    
    // Prevent duplicate calls
    if (fetchingRef.current && lastFetchParams.current === currentParams) {
      console.log('[useSessionMessages] Skipping duplicate fetch request');
      return;
    }

    fetchingRef.current = true;
    lastFetchParams.current = currentParams;
    
    setLoading(true);
    setError(null);

    try {
      console.log(`[useSessionMessages] === ROBUST MESSAGE FETCH ===`);
      console.log(`[useSessionMessages] Bot: ${botId}, Session: ${sessionToken}`);
      
      // Main retrieval using robust system
      const data = await getChatHistory(botId, sessionToken);

      if (data && data.length > 0) {
        console.log(`[useSessionMessages] Robust system retrieved ${data.length} messages`);
        
        const formattedMessages: SessionMessage[] = data.map((item: any) => ({
          id: item.message_id || item.id,
          message_content: item.message_content,
          message_type: (item.message_type === 'user' || item.message_type === 'bot') ? item.message_type : 'bot',
          created_at: item.message_timestamp || item.created_at,
          metadata: item.metadata,
          bot_user_id: item.bot_user_id,
        }));

        // Sort by timestamp
        formattedMessages.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        setMessages(formattedMessages);
        setError(null);
      } else {
        console.log('[useSessionMessages] No messages found in robust system');
        setMessages([]);
        setError(null);
      }

    } catch (err: any) {
      console.error('[useSessionMessages] Robust system exception:', err);
      setError(err.message || 'Échec lors du chargement des messages.');
      setMessages([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [botId, sessionToken]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Force refresh function
  const refreshMessages = useCallback(() => {
    fetchingRef.current = false;
    lastFetchParams.current = '';
    fetchMessages();
  }, [fetchMessages]);

  return { 
    messages, 
    loading, 
    error, 
    refetch: refreshMessages
  };
};
