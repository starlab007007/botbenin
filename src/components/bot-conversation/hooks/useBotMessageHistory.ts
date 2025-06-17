
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
      // Clear previous state
      setMessages([]);
      setError(null);

      if (!botId || !sessionToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        console.log(`[useBotMessageHistory] Fetching history for bot ${botId}, session ${sessionToken}`);
        
        const historyData = await getChatHistory(botId, sessionToken);
        
        if (historyData && Array.isArray(historyData) && historyData.length > 0) {
          console.log(`[useBotMessageHistory] Retrieved ${historyData.length} messages`);
          
          // Map and validate the data with proper type casting
          const mappedMessages: MessageHistoryItem[] = historyData.map((item: any) => ({
            message_id: item.message_id,
            bot_id: item.bot_id,
            bot_user_id: item.bot_user_id,
            message_timestamp: item.message_timestamp,
            message_content: item.message_content,
            message_type: (item.message_type === 'user' || item.message_type === 'bot') ? item.message_type : 'bot',
            ip_address: item.ip_address,
            user_agent: item.user_agent,
            metadata: item.metadata,
            session_id: item.session_id,
            user_name: item.user_name,
            user_email: item.user_email,
          }));
          
          setMessages(mappedMessages);
          setError(null);
        } else {
          console.log('[useBotMessageHistory] No history found');
          setMessages([]);
          setError(null);
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

  // Force refresh function
  const refreshHistory = async () => {
    if (!botId || !sessionToken) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[useBotMessageHistory] Force refreshing history for bot ${botId}, session ${sessionToken}`);
      
      const historyData = await getChatHistory(botId, sessionToken);
      
      if (historyData && Array.isArray(historyData)) {
        console.log(`[useBotMessageHistory] Force refresh retrieved ${historyData.length} messages`);
        
        // Map and validate the data with proper type casting
        const mappedMessages: MessageHistoryItem[] = historyData.map((item: any) => ({
          message_id: item.message_id,
          bot_id: item.bot_id,
          bot_user_id: item.bot_user_id,
          message_timestamp: item.message_timestamp,
          message_content: item.message_content,
          message_type: (item.message_type === 'user' || item.message_type === 'bot') ? item.message_type : 'bot',
          ip_address: item.ip_address,
          user_agent: item.user_agent,
          metadata: item.metadata,
          session_id: item.session_id,
          user_name: item.user_name,
          user_email: item.user_email,
        }));
        
        setMessages(mappedMessages);
      } else {
        setMessages([]);
      }
      
    } catch (err) {
      console.error('[useBotMessageHistory] Error in force refresh:', err);
      setError('Erreur lors du rafraîchissement');
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    error,
    refreshHistory
  };
};
