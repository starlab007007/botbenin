
import { supabase } from '@/integrations/supabase/client';

/**
 * Debug comprehensive session tokens across all systems
 */
export const debugSessionTokens = async (botId: string) => {
  try {
    console.log(`[debugUtils] === COMPREHENSIVE SESSION DEBUG ===`);
    console.log(`[debugUtils] Bot ID: ${botId}`);
    
    // 1. Check all anonymous visitor sessions
    const { data: anonymousSessions } = await supabase
      .from('anonymous_visitor_sessions')
      .select('*')
      .eq('bot_id', botId)
      .order('started_at', { ascending: false })
      .limit(10);

    console.log(`[debugUtils] Anonymous sessions found:`, anonymousSessions?.length || 0);
    anonymousSessions?.forEach((session, index) => {
      console.log(`[debugUtils] Anonymous Session ${index + 1}:`, {
        token: session.session_token,
        started: session.started_at,
        active: session.is_active
      });
    });

    // 2. Check all bot_users
    const { data: botUsers } = await supabase
      .from('bot_users')
      .select('*')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`[debugUtils] Bot users found:`, botUsers?.length || 0);
    botUsers?.forEach((user, index) => {
      console.log(`[debugUtils] Bot User ${index + 1}:`, {
        id: user.id,
        session_id: user.session_id,
        name: user.user_name,
        created: user.created_at
      });
    });

    // 3. Check all chat messages
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`[debugUtils] Messages found:`, messages?.length || 0);
    messages?.forEach((msg, index) => {
      // Safe property access for metadata
      const metadata = msg.metadata as any;
      const sessionToken = metadata && typeof metadata === 'object' 
        ? (metadata.session_token || metadata.sessionToken) 
        : 'N/A';
      
      console.log(`[debugUtils] Message ${index + 1}:`, {
        id: msg.id,
        bot_user_id: msg.bot_user_id,
        type: msg.message_type,
        session_token: sessionToken,
        created: msg.created_at
      });
    });

    // 4. Check enhanced chat sessions
    const { data: enhancedSessions } = await supabase
      .from('enhanced_chat_sessions')
      .select('*')
      .eq('bot_id', botId)
      .order('started_at', { ascending: false })
      .limit(10);

    console.log(`[debugUtils] Enhanced sessions found:`, enhancedSessions?.length || 0);
    enhancedSessions?.forEach((session, index) => {
      console.log(`[debugUtils] Enhanced Session ${index + 1}:`, {
        token: session.session_token,
        bot_user_id: session.bot_user_id,
        messages: session.total_messages,
        active: session.is_active
      });
    });

    return {
      anonymousSessions: anonymousSessions?.length || 0,
      botUsers: botUsers?.length || 0,
      messages: messages?.length || 0,
      enhancedSessions: enhancedSessions?.length || 0
    };

  } catch (error) {
    console.error('[debugUtils] Debug session tokens failed:', error);
    return null;
  }
};

/**
 * Test enhanced message retrieval with multiple strategies
 */
export const testEnhancedMessageRetrieval = async (botId: string, sessionToken: string) => {
  console.log(`[debugUtils] === ENHANCED MESSAGE RETRIEVAL TEST ===`);
  console.log(`[debugUtils] Bot: ${botId}, Session: ${sessionToken}`);

  const results = {
    directMessages: 0,
    botUserMatches: 0,
    sessionMatches: 0,
    metadataMatches: 0
  };

  try {
    // Strategy 1: Direct messages for bot
    const { data: directMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('bot_id', botId)
      .order('created_at', { ascending: true });

    results.directMessages = directMessages?.length || 0;
    console.log(`[debugUtils] Direct messages found: ${results.directMessages}`);

    // Strategy 2: Find bot_user with session
    const { data: botUser } = await supabase
      .from('bot_users')
      .select('*')
      .eq('bot_id', botId)
      .eq('session_id', sessionToken)
      .maybeSingle();

    if (botUser) {
      results.botUserMatches = 1;
      console.log(`[debugUtils] Bot user found:`, botUser);

      // Get messages for this bot_user
      const { data: userMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('bot_user_id', botUser.id)
        .order('created_at', { ascending: true });

      results.sessionMatches = userMessages?.length || 0;
      console.log(`[debugUtils] Messages for bot_user: ${results.sessionMatches}`);
    }

    // Strategy 3: Search by metadata with safe property access
    const { data: metadataMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('bot_id', botId)
      .or(`metadata->>session_token.eq.${sessionToken},metadata->>sessionToken.eq.${sessionToken}`)
      .order('created_at', { ascending: true });

    results.metadataMatches = metadataMessages?.length || 0;
    console.log(`[debugUtils] Metadata matches: ${results.metadataMatches}`);

    return results;

  } catch (error) {
    console.error('[debugUtils] Enhanced retrieval test failed:', error);
    return results;
  }
};

/**
 * Test message retrieval to verify data integrity
 */
export const testMessageRetrieval = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[debugUtils] Testing message retrieval for bot ${botId}, session ${sessionToken}`);
    
    const results = {
      totalMessages: 0,
      sessionMessages: 0,
      recentMessages: 0
    };

    // Test 1: Total messages for bot
    const { data: allMessages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('bot_id', botId);
    
    results.totalMessages = allMessages?.length || 0;

    // Test 2: Messages for specific session
    const { data: sessionMessages } = await supabase
      .from('chat_messages')
      .select(`
        *,
        bot_users!inner(session_id)
      `)
      .eq('bot_id', botId)
      .eq('bot_users.session_id', sessionToken);
    
    results.sessionMessages = sessionMessages?.length || 0;

    // Test 3: Recent messages
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('bot_id', botId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    results.recentMessages = recentMessages?.length || 0;

    console.log('[debugUtils] Retrieval test results:', results);
    return results;
    
  } catch (error) {
    console.error('[debugUtils] Test retrieval failed:', error);
    return null;
  }
};
