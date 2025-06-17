
import { supabase } from '@/integrations/supabase/client';

/**
 * Retrieve chat history using the corrected unified system with explicit security
 */
export const getChatHistory = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[historyManager] === SECURE CHAT HISTORY RETRIEVAL (FINAL CORRECTED) ===`);
    console.log(`[historyManager] Using final corrected secure DB functions`);
    console.log(`[historyManager] Bot ID: ${botId}`);
    console.log(`[historyManager] Session Token: ${sessionToken}`);
    
    // Use the final corrected get_unified_chat_history function with explicit table qualification
    const { data: unifiedData, error: unifiedError } = await supabase.rpc('get_unified_chat_history', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null,
      p_limit: 100,
      p_requesting_user_id: null // Let the function handle auth internally
    });

    if (unifiedError) {
      console.error('[historyManager] Final Corrected RPC Error:', unifiedError);
      
      // Fallback with final corrected secure query
      console.log('[historyManager] Attempting final corrected fallback query...');
      return await getMessagesWithFinalCorrection(botId, sessionToken);
    }

    if (unifiedData && unifiedData.length > 0) {
      console.log(`[historyManager] Final corrected system success: ${unifiedData.length} messages retrieved`);
      
      // Transform to expected format
      const transformedData = unifiedData.map((item: any) => ({
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

    // If unified RPC returns no data, try direct final corrected query
    console.log('[historyManager] Final corrected RPC returned no data, trying direct query...');
    return await getMessagesWithFinalCorrection(botId, sessionToken);

  } catch (err) {
    console.error('[historyManager] Exception in final corrected getChatHistory:', err);
    
    // Last attempt with final corrected query
    try {
      return await getMessagesWithFinalCorrection(botId, sessionToken);
    } catch (fallbackErr) {
      console.error('[historyManager] Final corrected fallback query also failed:', fallbackErr);
      return null;
    }
  }
};

/**
 * Direct query using final corrected approach with explicit table qualification and RLS protection
 */
const getMessagesWithFinalCorrection = async (botId: string, sessionToken: string) => {
  console.log('[historyManager] Executing final corrected direct query with explicit table qualification...');
  
  // Use explicit table aliases and RLS-protected queries with FINAL CORRECTION
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      id,
      bot_id,
      bot_user_id,
      message_content,
      message_type,
      created_at,
      ip_address,
      user_agent,
      metadata,
      bot_users!inner(
        id,
        session_id,
        user_name,
        user_email,
        created_at,
        last_active
      )
    `)
    .eq('bot_id', botId)
    .or(`bot_users.session_id.eq.${sessionToken},metadata->>session_token.eq.${sessionToken},metadata->>sessionToken.eq.${sessionToken}`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[historyManager] Final corrected direct query error:', error);
    throw error;
  }

  // Transform data to expected format
  const transformedData = data?.map((item: any) => ({
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
    user_email: item.bot_users?.user_email,
    user_first_seen: item.bot_users?.created_at,
    user_last_active: item.bot_users?.last_active
  })) || [];

  console.log(`[historyManager] Final corrected direct query success: ${transformedData.length} messages`);
  return transformedData;
};
