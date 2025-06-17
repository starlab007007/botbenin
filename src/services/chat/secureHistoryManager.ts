
import { supabase } from '@/integrations/supabase/client';

/**
 * Secure chat history manager that ensures data isolation between bot owners
 */

export interface SecureChatMessage {
  message_id: string;
  bot_id: string;
  bot_user_id: string;
  message_timestamp: string;
  message_content: string;
  message_type: 'user' | 'bot';
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  session_id: string;
  user_name: string;
  user_email?: string;
  session_start: string;
  bot_name: string;
  message_order_in_session: number;
}

export interface SecureBotSession {
  session_id: string;
  bot_id: string;
  bot_name: string;
  user_name: string;
  user_email?: string;
  session_start: string;
  last_activity: string;
  total_messages: number;
  is_active: boolean;
  entry_point: string;
}

/**
 * Get secure chat history for a bot owned by the authenticated user
 */
export const getSecureChatHistory = async (
  botId: string,
  sessionToken?: string
): Promise<SecureChatMessage[]> => {
  try {
    console.log(`[secureHistoryManager] Getting secure chat history for bot: ${botId}`);
    
    // Use direct SQL query instead of RPC to avoid type issues
    const { data, error } = await supabase.rpc('get_secure_chat_history' as any, {
      p_bot_id: botId,
      p_session_token: sessionToken || null
    });

    if (error) {
      console.error('[secureHistoryManager] Error getting secure chat history:', error);
      throw error;
    }

    // Ensure data is an array before mapping
    if (!Array.isArray(data)) {
      console.warn('[secureHistoryManager] Data is not an array:', data);
      return [];
    }

    // Parse the jsonb results
    const messages: SecureChatMessage[] = data.map((item: any) => ({
      message_id: item.message_id,
      bot_id: item.bot_id,
      bot_user_id: item.bot_user_id,
      message_timestamp: item.message_timestamp,
      message_content: item.message_content,
      message_type: item.message_type,
      ip_address: item.ip_address,
      user_agent: item.user_agent,
      metadata: item.metadata,
      session_id: item.session_id,
      user_name: item.user_name,
      user_email: item.user_email,
      session_start: item.session_start,
      bot_name: item.bot_name,
      message_order_in_session: item.message_order_in_session
    }));

    console.log(`[secureHistoryManager] Retrieved ${messages.length} secure messages`);
    return messages;

  } catch (error) {
    console.error('[secureHistoryManager] Exception in getSecureChatHistory:', error);
    return [];
  }
};

/**
 * Get all bot sessions for the authenticated user
 */
export const getOwnerBotSessions = async (botId?: string): Promise<SecureBotSession[]> => {
  try {
    console.log('[secureHistoryManager] Getting owner bot sessions');
    
    // Use direct SQL query instead of RPC to avoid type issues
    const { data, error } = await supabase.rpc('get_owner_bot_sessions' as any, {
      p_bot_id: botId || null
    });

    if (error) {
      console.error('[secureHistoryManager] Error getting bot sessions:', error);
      throw error;
    }

    // Ensure data is an array before mapping
    if (!Array.isArray(data)) {
      console.warn('[secureHistoryManager] Data is not an array:', data);
      return [];
    }

    const sessions: SecureBotSession[] = data.map((session: any) => ({
      session_id: session.session_id,
      bot_id: session.bot_id,
      bot_name: session.bot_name,
      user_name: session.user_name,
      user_email: session.user_email,
      session_start: session.session_start,
      last_activity: session.last_activity,
      total_messages: session.total_messages,
      is_active: session.is_active,
      entry_point: session.entry_point
    }));

    console.log(`[secureHistoryManager] Retrieved ${sessions.length} secure sessions`);
    return sessions;

  } catch (error) {
    console.error('[secureHistoryManager] Exception in getOwnerBotSessions:', error);
    return [];
  }
};

/**
 * Verify that a user owns a specific bot
 */
export const verifyBotOwnership = async (botId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: ownership } = await supabase
      .from('bots')
      .select(`
        owner_id,
        bot_owners!inner(user_id)
      `)
      .eq('id', botId)
      .eq('bot_owners.user_id', user.id)
      .maybeSingle();

    return !!ownership;
  } catch (error) {
    console.error('[secureHistoryManager] Error verifying bot ownership:', error);
    return false;
  }
};

/**
 * Get secure dashboard stats for the authenticated user
 */
export const getSecureDashboardStats = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get bot owner data
    const { data: ownerData } = await supabase
      .from('bot_owners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!ownerData) return null;

    // Use the secure dashboard stats function
    const { data, error } = await supabase.rpc('get_owner_dashboard_stats' as any, {
      owner_uuid: ownerData.id
    });

    if (error) throw error;

    return Array.isArray(data) ? data[0] : data;
  } catch (error) {
    console.error('[secureHistoryManager] Error getting secure dashboard stats:', error);
    return null;
  }
};
