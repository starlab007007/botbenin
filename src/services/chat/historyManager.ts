
import { supabase } from '@/integrations/supabase/client';

/**
 * Retrieve chat history using the corrected unified system
 */
export const getChatHistory = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[historyManager] === CORRECTED CHAT HISTORY RETRIEVAL ===`);
    console.log(`[historyManager] Using corrected DB functions without ambiguity`);
    console.log(`[historyManager] Bot ID: ${botId}`);
    console.log(`[historyManager] Session Token: ${sessionToken}`);
    
    // Use the corrected get_unified_chat_history function
    const { data: unifiedData, error: unifiedError } = await supabase.rpc('get_unified_chat_history', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null,
      p_limit: 100
    });

    if (unifiedError) {
      console.error('[historyManager] Corrected RPC Error (should be resolved now):', unifiedError);
      
      // Fallback with direct query using corrected approach
      console.log('[historyManager] Attempting corrected fallback query...');
      return await getMessagesWithCorrectedQuery(botId, sessionToken);
    }

    if (unifiedData && unifiedData.length > 0) {
      console.log(`[historyManager] Corrected system success: ${unifiedData.length} messages retrieved without ambiguity`);
      
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

    // If unified RPC returns no data, try direct corrected query
    console.log('[historyManager] Corrected RPC returned no data, trying direct query...');
    return await getMessagesWithCorrectedQuery(botId, sessionToken);

  } catch (err) {
    console.error('[historyManager] Exception in corrected getChatHistory:', err);
    
    // Last attempt with corrected query
    try {
      return await getMessagesWithCorrectedQuery(botId, sessionToken);
    } catch (fallbackErr) {
      console.error('[historyManager] Corrected fallback query also failed:', fallbackErr);
      return null;
    }
  }
};

/**
 * Direct query using corrected approach to avoid any ambiguity
 */
const getMessagesWithCorrectedQuery = async (botId: string, sessionToken: string) => {
  console.log('[historyManager] Executing corrected direct query without ambiguity...');
  
  // Use explicit table aliases and very specific queries to avoid any ambiguity
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
    console.error('[historyManager] Corrected direct query error:', error);
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

  console.log(`[historyManager] Corrected direct query success: ${transformedData.length} messages`);
  return transformedData;
};
