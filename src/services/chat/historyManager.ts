
import { supabase } from '@/integrations/supabase/client';

/**
 * Retrieve chat history using the corrected final system
 */
export const getChatHistory = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[historyManager] === CORRECTED FINAL SYSTEM CHAT HISTORY RETRIEVAL ===`);
    console.log(`[historyManager] Using corrected final functions`);
    console.log(`[historyManager] Bot ID: ${botId}`);
    console.log(`[historyManager] Session Token: ${sessionToken}`);
    
    // Use the corrected get_chat_history_final function
    const { data: finalData, error: finalError } = await supabase.rpc('get_chat_history_final', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null,
      p_limit: 100
    });

    if (finalError) {
      console.error('[historyManager] Corrected final system RPC Error:', finalError);
      return null;
    }

    if (finalData && finalData.length > 0) {
      console.log(`[historyManager] Corrected final system success: ${finalData.length} messages retrieved`);
      
      // Transform to expected format
      const transformedData = finalData.map((item: any) => ({
        id: item.message_id,
        message_id: item.message_id,
        bot_id: item.bot_id,
        bot_user_id: item.bot_user_id,
        created_at: item.message_timestamp,
        message_timestamp: item.message_timestamp,
        message_content: item.message_content,
        message_type: item.message_type,
        ip_address: item.ip_address,
        user_agent: item.user_agent,
        metadata: item.metadata,
        session_id: item.session_id || 'unknown',
        user_name: item.user_name || 'Utilisateur Anonyme',
        user_email: item.user_email
      }));
      
      return transformedData;
    }

    console.log('[historyManager] Corrected final system returned no data');
    return [];

  } catch (err) {
    console.error('[historyManager] Exception in corrected final system getChatHistory:', err);
    return null;
  }
};
