
import { supabase } from '@/integrations/supabase/client';

/**
 * Retrieve chat history using multiple strategies for maximum compatibility
 */
export const getChatHistory = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[historyManager] === COMPREHENSIVE CHAT HISTORY RETRIEVAL ===`);
    console.log(`[historyManager] Bot ID: ${botId}`);
    console.log(`[historyManager] Session Token: ${sessionToken}`);
    
    // Strategy 1: Try the corrected final system first
    const { data: finalData, error: finalError } = await supabase.rpc('get_chat_history_final', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null,
      p_limit: 100
    });

    if (!finalError && finalData && finalData.length > 0) {
      console.log(`[historyManager] Final system success: ${finalData.length} messages retrieved`);
      return transformHistoryData(finalData);
    }

    // Strategy 2: Try the standard get_chat_history function
    const { data: standardData, error: standardError } = await supabase.rpc('get_chat_history', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null
    });

    if (!standardError && standardData && standardData.length > 0) {
      console.log(`[historyManager] Standard system success: ${standardData.length} messages retrieved`);
      return transformHistoryData(standardData);
    }

    // Strategy 3: Direct table query as fallback
    const { data: directData, error: directError } = await supabase
      .from('chat_messages')
      .select(`
        id,
        bot_id,
        bot_user_id,
        created_at,
        message_content,
        message_type,
        ip_address,
        user_agent,
        metadata,
        bot_users!inner(session_id, user_name, user_email)
      `)
      .eq('bot_id', botId)
      .or(`bot_users.session_id.eq.${sessionToken},metadata->>session_token.eq.${sessionToken},metadata->>sessionToken.eq.${sessionToken}`)
      .order('created_at', { ascending: true });

    if (!directError && directData && directData.length > 0) {
      console.log(`[historyManager] Direct query success: ${directData.length} messages retrieved`);
      
      const transformedData = directData.map((item: any) => ({
        id: item.id,
        message_id: item.id,
        bot_id: item.bot_id,
        bot_user_id: item.bot_user_id,
        created_at: item.created_at,
        message_timestamp: item.created_at,
        message_content: item.message_content,
        message_type: item.message_type,
        ip_address: item.ip_address,
        user_agent: item.user_agent,
        metadata: item.metadata,
        session_id: item.bot_users?.session_id || sessionToken,
        user_name: item.bot_users?.user_name || 'Utilisateur Anonyme',
        user_email: item.bot_users?.user_email
      }));
      
      return transformedData;
    }

    console.log('[historyManager] No data found with any strategy');
    return [];

  } catch (err) {
    console.error('[historyManager] Exception in comprehensive getChatHistory:', err);
    return null;
  }
};

/**
 * Transform history data to consistent format
 */
const transformHistoryData = (data: any[]) => {
  return data.map((item: any) => ({
    id: item.message_id || item.id,
    message_id: item.message_id || item.id,
    bot_id: item.bot_id,
    bot_user_id: item.bot_user_id,
    created_at: item.message_timestamp || item.created_at,
    message_timestamp: item.message_timestamp || item.created_at,
    message_content: item.message_content,
    message_type: item.message_type,
    ip_address: item.ip_address,
    user_agent: item.user_agent,
    metadata: item.metadata,
    session_id: item.session_id || 'unknown',
    user_name: item.user_name || 'Utilisateur Anonyme',
    user_email: item.user_email
  }));
};

/**
 * Get all chat sessions for a bot (for dashboard display)
 */
export const getAllBotSessions = async (botId: string) => {
  try {
    console.log(`[historyManager] Getting all sessions for bot: ${botId}`);
    
    // Get enhanced chat sessions
    const { data: enhancedSessions, error: enhancedError } = await supabase
      .from('enhanced_chat_sessions')
      .select(`
        id,
        bot_id,
        bot_user_id,
        session_token,
        started_at,
        last_activity,
        is_active,
        total_messages,
        entry_point,
        user_agent,
        referrer_url,
        bot_users(user_name, user_email, session_id)
      `)
      .eq('bot_id', botId)
      .order('started_at', { ascending: false });

    // Get anonymous visitor sessions
    const { data: anonymousSessions, error: anonymousError } = await supabase
      .from('anonymous_visitor_sessions')
      .select(`
        id,
        bot_id,
        session_token,
        started_at,
        last_activity,
        is_active,
        entry_point,
        referrer_url,
        total_interactions
      `)
      .eq('bot_id', botId)
      .order('started_at', { ascending: false });

    const allSessions = [];

    // Add enhanced sessions
    if (!enhancedError && enhancedSessions) {
      allSessions.push(...enhancedSessions.map(session => ({
        ...session,
        session_type: 'enhanced',
        user_name: session.bot_users?.user_name || 'Utilisateur Anonyme',
        user_email: session.bot_users?.user_email
      })));
    }

    // Add anonymous sessions
    if (!anonymousError && anonymousSessions) {
      allSessions.push(...anonymousSessions.map(session => ({
        ...session,
        session_type: 'anonymous',
        total_messages: session.total_interactions || 0,
        user_name: 'Visiteur Anonyme',
        user_email: null
      })));
    }

    console.log(`[historyManager] Retrieved ${allSessions.length} total sessions`);
    return allSessions;

  } catch (error) {
    console.error('[historyManager] Error getting all bot sessions:', error);
    return [];
  }
};
