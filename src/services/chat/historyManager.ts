
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced function to retrieve chat history using the new unified system
 */
export const getChatHistory = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[historyManager] === UNIFIED CHAT HISTORY RETRIEVAL ===`);
    console.log(`[historyManager] Bot ID: ${botId}`);
    console.log(`[historyManager] Session Token: ${sessionToken}`);
    
    // Use the new unified RPC function
    const { data: unifiedData, error: unifiedError } = await supabase.rpc('get_unified_chat_history', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null,
      p_limit: 100
    });

    if (unifiedError) {
      console.error('[historyManager] Unified RPC Error:', unifiedError);
      
      // Fallback with direct query using the new view
      console.log('[historyManager] Attempting fallback with unified view...');
      return await getMessagesFromUnifiedView(botId, sessionToken);
    }

    if (unifiedData && unifiedData.length > 0) {
      console.log(`[historyManager] Unified system success: ${unifiedData.length} messages retrieved`);
      return unifiedData;
    }

    // If unified RPC returns no data, try direct view query
    console.log('[historyManager] Unified RPC returned no data, trying direct view query...');
    return await getMessagesFromUnifiedView(botId, sessionToken);

  } catch (err) {
    console.error('[historyManager] Exception in getChatHistory:', err);
    
    // Last attempt with unified view
    try {
      return await getMessagesFromUnifiedView(botId, sessionToken);
    } catch (fallbackErr) {
      console.error('[historyManager] Unified view query also failed:', fallbackErr);
      return null;
    }
  }
};

/**
 * Direct query using the new unified conversation history view
 */
const getMessagesFromUnifiedView = async (botId: string, sessionToken: string) => {
  console.log('[historyManager] Executing unified view query...');
  
  // Query the new unified view directly
  const { data, error } = await supabase
    .from('unified_conversation_history')
    .select('*')
    .eq('bot_id', botId)
    .or(`session_id.eq.${sessionToken},enhanced_session_token.eq.${sessionToken},metadata->>session_token.eq.${sessionToken},metadata->>sessionToken.eq.${sessionToken}`)
    .order('message_timestamp', { ascending: true });

  if (error) {
    console.error('[historyManager] Unified view query error:', error);
    throw error;
  }

  // Transform data to expected format (the view already provides most fields)
  const transformedData = data?.map((item: any) => ({
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
    session_id: item.session_id || item.enhanced_session_token || 'unknown',
    user_name: item.user_name || 'Utilisateur Anonyme',
    user_email: item.user_email,
    user_first_seen: item.user_first_seen,
    user_last_active: item.user_last_active,
    bot_name: item.bot_name,
    owner_id: item.owner_id,
    session_start: item.session_start,
    entry_point: item.entry_point
  })) || [];

  console.log(`[historyManager] Unified view success: ${transformedData.length} messages`);
  return transformedData;
};
