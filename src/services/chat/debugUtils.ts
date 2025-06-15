
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced debugging utilities for the unified chat system
 */
export const debugSessionTokens = async (botId: string) => {
  try {
    console.log(`[debugUtils] === UNIFIED SYSTEM DEBUG ===`);
    console.log(`[debugUtils] Bot ID: ${botId}`);
    
    // Debug session anomalies
    const { data: anomalies } = await supabase
      .from('logs_session_anomalies')
      .select('*')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`[debugUtils] Recent session anomalies:`, anomalies);
    
    // Debug bot_users for this bot
    const { data: botUsers } = await supabase
      .from('bot_users')
      .select('id, session_id, user_name, created_at, last_active')
      .eq('bot_id', botId)
      .order('last_active', { ascending: false })
      .limit(10);
    
    console.log(`[debugUtils] Recent bot users:`, botUsers);
    
    // Debug anonymous sessions
    const { data: anonSessions } = await supabase
      .from('anonymous_visitor_sessions')
      .select('session_token, entry_point, started_at, last_activity')
      .eq('bot_id', botId)
      .order('last_activity', { ascending: false })
      .limit(10);
    
    console.log(`[debugUtils] Recent anonymous sessions:`, anonSessions);
    
    // Debug enhanced sessions
    const { data: enhancedSessions } = await supabase
      .from('enhanced_chat_sessions')
      .select('session_token, bot_user_id, entry_point, started_at, total_messages')
      .eq('bot_id', botId)
      .order('last_activity', { ascending: false })
      .limit(10);
    
    console.log(`[debugUtils] Recent enhanced sessions:`, enhancedSessions);
    
    return {
      anomalies: anomalies || [],
      botUsers: botUsers || [],
      anonSessions: anonSessions || [],
      enhancedSessions: enhancedSessions || []
    };
  } catch (err) {
    console.error('[debugUtils] Debug failed:', err);
    return null;
  }
};

/**
 * Enhanced message retrieval testing with unified system
 */
export const testEnhancedMessageRetrieval = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[debugUtils] === TESTING UNIFIED MESSAGE RETRIEVAL ===`);
    
    // Test the unified RPC function
    const { data: unifiedData, error: unifiedError } = await supabase.rpc('get_unified_chat_history', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_limit: 50
    });
    
    console.log(`[debugUtils] Unified RPC result:`, { 
      success: !unifiedError, 
      messageCount: unifiedData?.length || 0,
      error: unifiedError 
    });
    
    // Test direct view query
    const { data: viewData, error: viewError } = await supabase
      .from('unified_conversation_history')
      .select('message_id, message_content, message_type, session_id, user_name')
      .eq('bot_id', botId)
      .or(`session_id.eq.${sessionToken},enhanced_session_token.eq.${sessionToken}`)
      .limit(10);
    
    console.log(`[debugUtils] Direct view result:`, {
      success: !viewError,
      messageCount: viewData?.length || 0,
      error: viewError
    });
    
    return {
      unifiedRpc: { success: !unifiedError, count: unifiedData?.length || 0 },
      directView: { success: !viewError, count: viewData?.length || 0 }
    };
  } catch (err) {
    console.error('[debugUtils] Enhanced test failed:', err);
    return null;
  }
};

/**
 * Legacy test function - kept for compatibility
 */
export const testMessageRetrieval = async (botId: string, sessionToken: string) => {
  console.log('[debugUtils] Legacy test - redirecting to enhanced test...');
  return await testEnhancedMessageRetrieval(botId, sessionToken);
};
