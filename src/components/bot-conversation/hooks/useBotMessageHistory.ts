
import { useState, useEffect } from 'react';
import { getChatHistory } from '@/services/chat/historyManager';

interface MessageHistoryItem {
  message_id: string;
  bot_id: string;
  bot_user_id: string;
  message_timestamp: string;
  message_content: string;
  message_type: 'user' | 'bot';
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  session_id: string;
  user_name?: string;
  user_email?: string;
}

export const useBotMessageHistory = (botId: string | null, sessionToken: string | null) => {
  const [messages, setMessages] = useState<MessageHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!botId || !sessionToken) {
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log(`[useBotMessageHistory] Fetching history for bot ${botId}, session ${sessionToken}`);
        
        const historyData = await getChatHistory(botId, sessionToken);
        
        if (historyData && Array.isArray(historyData)) {
          console.log(`[useBotMessageHistory] Retrieved ${historyData.length} messages`);
          setMessages(historyData);
        } else if (historyData === null) {
          setError('Erreur lors de la récupération de l\'historique');
          setMessages([]);
        } else {
          console.log('[useBotMessageHistory] No history found');
          setMessages([]);
        }
        
      } catch (err) {
        console.error('[useBotMessageHistory] Error fetching history:', err);
        setError('Impossible de charger l\'historique des messages');
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [botId, sessionToken]);

  return {
    messages,
    loading,
    error
  };
};
