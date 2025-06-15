
import { supabase } from '@/integrations/supabase/client';

/**
 * Fonction améliorée pour récupérer l'historique des messages avec la nouvelle fonction optimisée
 */
export const getChatHistory = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[historyManager] === GETTING CHAT HISTORY WITH ENHANCED FUNCTION ===`);
    console.log(`[historyManager] Bot ID: ${botId}`);
    console.log(`[historyManager] Session Token: ${sessionToken}`);
    
    const { data, error } = await supabase.rpc('get_chat_history', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null,
    });

    if (error) {
      console.error('[historyManager] Error in getChatHistory:', error);
      return null;
    }

    console.log(`[historyManager] Enhanced chat history retrieved: ${data?.length || 0} messages`);
    return data;
  } catch (err) {
    console.error('[historyManager] Exception in getChatHistory:', err);
    return null;
  }
};
