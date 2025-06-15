
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced cleanup function using the new unified system
 */
export const cleanupChatData = async (botId?: string) => {
  try {
    console.log(`[dataCleanup] === UNIFIED CHAT DATA CLEANUP ===`);
    console.log(`[dataCleanup] Bot ID: ${botId || 'ALL BOTS'}`);
    
    // Use the new cleanup and consolidation function
    const { data, error } = await supabase.rpc('cleanup_and_consolidate_chat_data', {
      p_bot_id: botId || null,
    });

    if (error) {
      console.error('[dataCleanup] Unified cleanup error:', error);
      return null;
    }

    console.log('[dataCleanup] Unified cleanup completed:', data);
    
    // Also check for session anomalies after cleanup
    if (botId) {
      const { data: anomalies } = await supabase
        .from('logs_session_anomalies')
        .select('anomaly_type, created_at')
        .eq('bot_id', botId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      console.log('[dataCleanup] Recent anomalies for bot:', anomalies);
    }
    
    return data;
  } catch (err) {
    console.error('[dataCleanup] Exception in unified cleanup:', err);
    return null;
  }
};
