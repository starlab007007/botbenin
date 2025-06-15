
import { supabase } from '@/integrations/supabase/client';

/**
 * Fonction améliorée pour récupérer l'historique des messages avec stratégies multiples
 */
export const getChatHistory = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[historyManager] === ENHANCED CHAT HISTORY RETRIEVAL ===`);
    console.log(`[historyManager] Bot ID: ${botId}`);
    console.log(`[historyManager] Session Token: ${sessionToken}`);
    
    // Stratégie 1: Utiliser la fonction RPC optimisée
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_chat_history', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null,
    });

    if (rpcError) {
      console.error('[historyManager] RPC Error:', rpcError);
      
      // Stratégie 2: Fallback avec requête directe
      console.log('[historyManager] Attempting direct query fallback...');
      return await getMessagesDirectQuery(botId, sessionToken);
    }

    if (rpcData && rpcData.length > 0) {
      console.log(`[historyManager] RPC success: ${rpcData.length} messages retrieved`);
      return rpcData;
    }

    // Stratégie 3: Si RPC ne retourne rien, essayer la requête directe
    console.log('[historyManager] RPC returned no data, trying direct query...');
    return await getMessagesDirectQuery(botId, sessionToken);

  } catch (err) {
    console.error('[historyManager] Exception in getChatHistory:', err);
    
    // Dernière tentative avec requête directe
    try {
      return await getMessagesDirectQuery(botId, sessionToken);
    } catch (fallbackErr) {
      console.error('[historyManager] Fallback query also failed:', fallbackErr);
      return null;
    }
  }
};

/**
 * Requête directe en fallback pour récupérer les messages
 */
const getMessagesDirectQuery = async (botId: string, sessionToken: string) => {
  console.log('[historyManager] Executing direct query fallback...');
  
  // Requête directe avec jointures
  const { data, error } = await supabase
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
      bot_users!inner (
        id,
        session_id,
        user_name,
        user_email,
        created_at,
        last_active
      ),
      bots!inner (
        id,
        name,
        owner_id
      )
    `)
    .eq('bot_id', botId)
    .or(`bot_users.session_id.eq.${sessionToken},metadata->>session_token.eq.${sessionToken},metadata->>sessionToken.eq.${sessionToken}`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[historyManager] Direct query error:', error);
    throw error;
  }

  // Transformer les données au format attendu
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
    session_id: item.bot_users?.session_id || item.metadata?.session_token || 'unknown',
    user_name: item.bot_users?.user_name || 'Utilisateur Anonyme',
    user_email: item.bot_users?.user_email,
    user_first_seen: item.bot_users?.created_at,
    user_last_active: item.bot_users?.last_active,
    bot_name: item.bots?.name,
    owner_id: item.bots?.owner_id
  })) || [];

  console.log(`[historyManager] Direct query success: ${transformedData.length} messages`);
  return transformedData;
};
