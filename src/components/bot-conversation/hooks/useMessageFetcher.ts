
import { useState, useCallback, useEffect, useRef } from "react";
import { getChatHistory } from "@/services/chat";
import { BotMessageHistoryItem } from "../types";

const mapRawMessagesToTyped = (data: any[]): BotMessageHistoryItem[] => {
  if (!data) return [];
  return data.map((msg: any) => ({
    message_id: msg.message_id || msg.id,
    bot_id: msg.bot_id,
    bot_user_id: msg.bot_user_id,
    message_content: msg.message_content,
    message_type: msg.message_type as 'user' | 'bot',
    message_timestamp: msg.message_timestamp || msg.created_at,
    ip_address: msg.ip_address,
    user_agent: msg.user_agent,
    metadata: msg.metadata,
    user_name: msg.user_name,
    user_email: msg.user_email,
    session_id: msg.session_id,
    user_first_seen: msg.user_first_seen,
    user_last_active: msg.user_last_active,
    bot_name: msg.bot_name,
    owner_id: msg.owner_id,
  }));
};

export const useMessageFetcher = (botId: string | null, botUserId: string | null, sessionToken: string | null) => {
  const [messages, setMessages] = useState<BotMessageHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Protection contre les appels multiples
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!botId || !sessionToken) {
      console.log('[useMessageFetcher] Missing botId or sessionToken, clearing messages');
      setMessages([]);
      setError(null);
      return;
    }

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Éviter les appels multiples simultanés
    if (fetchingRef.current) {
      console.log('[useMessageFetcher] Fetch already in progress, skipping');
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    // Créer un nouveau contrôleur d'abandon
    abortControllerRef.current = new AbortController();

    console.log(`[useMessageFetcher] === ENHANCED MESSAGE FETCHING ===`);
    console.log(`[useMessageFetcher] Bot: ${botId}, Session: ${sessionToken}`);

    try {
      // Utiliser la fonction getChatHistory améliorée
      const data = await getChatHistory(botId, sessionToken);

      // Vérifier si la requête a été annulée
      if (abortControllerRef.current?.signal.aborted) {
        console.log('[useMessageFetcher] Request was aborted');
        return;
      }

      if (data && data.length > 0) {
        const allMessages = mapRawMessagesToTyped(data);
        
        // Supprimer les doublons par message_id
        const uniqueMessages = Array.from(
          new Map(allMessages.map(item => [item.message_id, item])).values()
        );
        
        // Trier par timestamp
        uniqueMessages.sort(
          (a, b) => new Date(a.message_timestamp).getTime() - new Date(b.message_timestamp).getTime()
        );

        console.log(`[useMessageFetcher] Successfully processed ${uniqueMessages.length} unique messages`);
        setMessages(uniqueMessages);
        setError(null);
      } else {
        console.log('[useMessageFetcher] No messages found');
        setMessages([]);
        setError(null);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[useMessageFetcher] Request was aborted');
        return;
      }
      
      console.error('[useMessageFetcher] Exception in fetchMessages:', err);
      setError('Failed to fetch message history');
      setMessages([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [botId, sessionToken]);

  useEffect(() => {
    fetchMessages();
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchingRef.current = false;
    };
  }, [fetchMessages]);

  // Fonction pour forcer un refresh
  const refreshMessages = useCallback(() => {
    fetchingRef.current = false;
    fetchMessages();
  }, [fetchMessages]);

  return { 
    messages, 
    loadingMessages: loading, 
    errorMessages: error, 
    fetchMessages: refreshMessages, 
    setMessages 
  };
};
