
import { supabase } from '@/integrations/supabase/client';

/**
 * Retrieve chat history using a robust, multi-strategy approach
 */
export const getChatHistory = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[historyManager] === ROBUST CHAT HISTORY RETRIEVAL ===`);
    console.log(`[historyManager] Bot ID: ${botId}`);
    console.log(`[historyManager] Session Token: ${sessionToken}`);
    
    if (!botId || !sessionToken) {
      console.warn('[historyManager] Missing required parameters');
      return [];
    }

    // Strategy 1: Find bot_user and get their messages
    const { data: botUser } = await supabase
      .from('bot_users')
      .select('id, user_name, user_email, session_id')
      .eq('bot_id', botId)
      .eq('session_id', sessionToken)
      .maybeSingle();

    if (botUser) {
      console.log(`[historyManager] Found bot_user: ${botUser.id}`);
      
      const { data: userMessages } = await supabase
        .from('chat_messages')
        .select(`
          id,
          message_content,
          message_type,
          created_at,
          metadata,
          ip_address,
          user_agent,
          bot_user_id,
          bot_id
        `)
        .eq('bot_user_id', botUser.id)
        .order('created_at', { ascending: true });

      if (userMessages && userMessages.length > 0) {
        console.log(`[historyManager] Strategy 1 success: ${userMessages.length} messages`);
        return userMessages.map(msg => ({
          message_id: msg.id,
          bot_id: msg.bot_id,
          bot_user_id: msg.bot_user_id,
          message_timestamp: msg.created_at,
          message_content: msg.message_content,
          message_type: msg.message_type,
          ip_address: msg.ip_address,
          user_agent: msg.user_agent,
          metadata: msg.metadata,
          session_id: botUser.session_id,
          user_name: botUser.user_name || 'Utilisateur Anonyme',
          user_email: botUser.user_email
        }));
      }
    }

    // Strategy 2: Search by metadata session token
    console.log('[historyManager] Strategy 1 failed, trying metadata search...');
    const { data: metadataMessages } = await supabase
      .from('chat_messages')
      .select(`
        id,
        message_content,
        message_type,
        created_at,
        metadata,
        ip_address,
        user_agent,
        bot_user_id,
        bot_id
      `)
      .eq('bot_id', botId)
      .or(`metadata->>session_token.eq.${sessionToken},metadata->>sessionToken.eq.${sessionToken}`)
      .order('created_at', { ascending: true });

    if (metadataMessages && metadataMessages.length > 0) {
      console.log(`[historyManager] Strategy 2 success: ${metadataMessages.length} messages`);
      return metadataMessages.map(msg => ({
        message_id: msg.id,
        bot_id: msg.bot_id,
        bot_user_id: msg.bot_user_id,
        message_timestamp: msg.created_at,
        message_content: msg.message_content,
        message_type: msg.message_type,
        ip_address: msg.ip_address,
        user_agent: msg.user_agent,
        metadata: msg.metadata,
        session_id: sessionToken,
        user_name: 'Utilisateur Anonyme',
        user_email: null
      }));
    }

    // Strategy 3: Auto-reconcile and create missing links
    console.log('[historyManager] Strategy 2 failed, attempting auto-reconciliation...');
    
    // Check if we have anonymous session
    const { data: anonymousSession } = await supabase
      .from('anonymous_visitor_sessions')
      .select('*')
      .eq('bot_id', botId)
      .eq('session_token', sessionToken)
      .maybeSingle();

    if (anonymousSession) {
      console.log('[historyManager] Found anonymous session, creating bot_user...');
      
      // Create bot_user for this session
      const { data: newBotUser, error: createError } = await supabase
        .from('bot_users')
        .insert({
          bot_id: botId,
          session_id: sessionToken,
          user_name: 'Visiteur Récupéré',
          is_authenticated: false,
          last_active: new Date().toISOString()
        })
        .select('id, user_name, user_email, session_id')
        .single();

      if (!createError && newBotUser) {
        console.log(`[historyManager] Created bot_user: ${newBotUser.id}`);
        
        // Now try to get messages again
        const { data: reconciledMessages } = await supabase
          .from('chat_messages')
          .select(`
            id,
            message_content,
            message_type,
            created_at,
            metadata,
            ip_address,
            user_agent,
            bot_user_id,
            bot_id
          `)
          .eq('bot_id', botId)
          .or(`metadata->>session_token.eq.${sessionToken},metadata->>sessionToken.eq.${sessionToken}`)
          .order('created_at', { ascending: true });

        if (reconciledMessages && reconciledMessages.length > 0) {
          // Update messages to link to new bot_user
          for (const msg of reconciledMessages) {
            if (!msg.bot_user_id) {
              await supabase
                .from('chat_messages')
                .update({ bot_user_id: newBotUser.id })
                .eq('id', msg.id);
            }
          }

          console.log(`[historyManager] Strategy 3 success: ${reconciledMessages.length} messages reconciled`);
          return reconciledMessages.map(msg => ({
            message_id: msg.id,
            bot_id: msg.bot_id,
            bot_user_id: newBotUser.id,
            message_timestamp: msg.created_at,
            message_content: msg.message_content,
            message_type: msg.message_type,
            ip_address: msg.ip_address,
            user_agent: msg.user_agent,
            metadata: msg.metadata,
            session_id: sessionToken,
            user_name: newBotUser.user_name,
            user_email: newBotUser.user_email
          }));
        }
      }
    }

    console.log('[historyManager] All strategies failed, no messages found');
    return [];

  } catch (err) {
    console.error('[historyManager] Exception in getChatHistory:', err);
    return [];
  }
};

/**
 * Get all chat sessions for a bot (for dashboard display)
 */
export const getAllBotSessions = async (botId: string) => {
  try {
    console.log(`[historyManager] Getting all sessions for bot: ${botId}`);
    
    const allSessions = [];

    // Get enhanced chat sessions with bot_users data
    const { data: enhancedSessions } = await supabase
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
    const { data: anonymousSessions } = await supabase
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

    // Get direct bot_users (may not have enhanced sessions)
    const { data: directBotUsers } = await supabase
      .from('bot_users')
      .select(`
        id,
        bot_id,
        session_id,
        user_name,
        user_email,
        created_at,
        last_active,
        is_authenticated
      `)
      .eq('bot_id', botId)
      .order('created_at', { ascending: false });

    // Combine enhanced sessions
    if (enhancedSessions) {
      allSessions.push(...enhancedSessions.map(session => ({
        ...session,
        session_type: 'enhanced',
        user_name: session.bot_users?.user_name || 'Utilisateur Anonyme',
        user_email: session.bot_users?.user_email
      })));
    }

    // Combine anonymous sessions
    if (anonymousSessions) {
      allSessions.push(...anonymousSessions.map(session => ({
        ...session,
        session_type: 'anonymous',
        total_messages: session.total_interactions || 0,
        user_name: 'Visiteur Anonyme',
        user_email: null
      })));
    }

    // Add direct bot_users that might not be in enhanced sessions
    if (directBotUsers) {
      for (const botUser of directBotUsers) {
        const existsInEnhanced = allSessions.some(s => 
          s.session_token === botUser.session_id || s.bot_user_id === botUser.id
        );
        
        if (!existsInEnhanced) {
          // Get message count for this bot_user
          const { data: messageCount } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact' })
            .eq('bot_user_id', botUser.id);

          allSessions.push({
            id: botUser.id,
            bot_id: botUser.bot_id,
            bot_user_id: botUser.id,
            session_token: botUser.session_id,
            started_at: botUser.created_at,
            last_activity: botUser.last_active,
            is_active: true,
            total_messages: messageCount?.length || 0,
            entry_point: 'direct',
            session_type: 'bot_user',
            user_name: botUser.user_name || 'Utilisateur',
            user_email: botUser.user_email
          });
        }
      }
    }

    console.log(`[historyManager] Retrieved ${allSessions.length} total sessions`);
    return allSessions;

  } catch (error) {
    console.error('[historyManager] Error getting all bot sessions:', error);
    return [];
  }
};
