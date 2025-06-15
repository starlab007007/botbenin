
import { supabase } from '@/integrations/supabase/client';

/**
 * Fonction pour nettoyer et consolider les données de chat
 */
export const cleanupChatData = async (botId?: string) => {
  try {
    console.log(`[dataCleanup] === CLEANING UP CHAT DATA ===`);
    console.log(`[dataCleanup] Bot ID: ${botId || 'ALL BOTS'}`);
    
    const { data, error } = await supabase.rpc('cleanup_and_consolidate_chat_data', {
      p_bot_id: botId || null,
    });

    if (error) {
      console.error('[dataCleanup] Error in cleanupChatData:', error);
      return null;
    }

    console.log('[dataCleanup] Cleanup completed:', data);
    return data;
  } catch (err) {
    console.error('[dataCleanup] Exception in cleanupChatData:', err);
    return null;
  }
};
