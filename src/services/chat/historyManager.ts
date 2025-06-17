
import { supabase } from '@/integrations/supabase/client';

/**
 * Retrieve chat history using the corrected unified system with security
 */
export const getChatHistory = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[historyManager] === SECURE CHAT HISTORY RETRIEVAL ===`);
    console.log(`[historyManager] Using corrected secure DB functions`);
    console.log(`[historyManager] Bot ID: ${botId}`);
    console.log(`[historyManager] Session Token: ${sessionToken}`);
    
    // Use the corrected get_unified_chat_history function with security
    const { data: unifiedData, error: unifiedError } = await supabase.rpc('get_unified_chat_history', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null,
      p_limit: 100,
      p_requesting_user_id: null // Let the function handle auth internally
    });

    if (unifiedError) {
      console.error('[historyManager] Secure RPC Error:', unifiedError);
      
      // Fallback with corrected secure query
      console.log('[historyManager] Attempting secure fallback query...');
      return await getMessagesWithSecureQuery(botId, sessionToken);
    }

    if (unifiedData && unifiedData.length > 0) {
      console.log(`[historyManager] Secure system success: ${unifiedData.length} messages retrieved`);
      
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

    // If unified RPC returns no data, try direct secure query
    console.log('[historyManager] Secure RPC returned no data, trying direct query...');
    return await getMessagesWithSecureQuery(botId, sessionToken);

  } catch (err) {
    console.error('[historyManager] Exception in secure getChatHistory:', err);
    
    // Last attempt with secure query
    try {
      return await getMessagesWithSecureQuery(botId, sessionToken);
    } catch (fallbackErr) {
      console.error('[historyManager] Secure fallback query also failed:', fallbackErr);
      return null;
    }
  }
};

/**
 * Direct query using corrected secure approach with RLS protection
 */
const getMessagesWithSecureQuery = async (botId: string, sessionToken: string) => {
  console.log('[historyManager] Executing secure direct query with RLS protection...');
  
  // Use explicit table aliases and RLS-protected queries
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
    console.error('[historyManager] Secure direct query error:', error);
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

  console.log(`[historyManager] Secure direct query success: ${transformedData.length} messages`);
  return transformedData;
};
