
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Save chat message with robust session handling
 */
export const saveChatMessage = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: Json = {}
) => {
  try {
    console.log(`[messageOperations] === ROBUST MESSAGE SAVING ===`);
    console.log(`[messageOperations] Bot ID: ${botId}`);
    console.log(`[messageOperations] Session Token: ${sessionToken}`);
    console.log(`[messageOperations] Message Type: ${type}`);
    
    // Enhanced parameter validation
    if (!botId || !sessionToken || !content || !type) {
      throw new Error('Missing required parameters for message saving');
    }
    
    // Enhanced metadata
    const finalMetadata = {
      ...(metadata && typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata) ? metadata : {}),
      session_token: sessionToken,
      sessionToken: sessionToken,
      saved_at: new Date().toISOString(),
      message_type: type,
      platform: 'bot_bj_robust_system'
    };

    // Step 1: Ensure bot_user exists
    let botUserId;
    
    // Try to find existing bot_user
    const { data: existingUser } = await supabase
      .from('bot_users')
      .select('id')
      .eq('bot_id', botId)
      .eq('session_id', sessionToken)
      .maybeSingle();

    if (existingUser) {
      botUserId = existingUser.id;
      console.log(`[messageOperations] Using existing bot_user: ${botUserId}`);
    } else {
      // Create new bot_user
      console.log('[messageOperations] Creating new bot_user...');
      const { data: newUser, error: userError } = await supabase
        .from('bot_users')
        .insert({
          bot_id: botId,
          session_id: sessionToken,
          user_name: `Session ${sessionToken.slice(0, 8)}`,
          is_authenticated: false,
          last_active: new Date().toISOString()
        })
        .select('id')
        .single();

      if (userError) {
        console.error('[messageOperations] Failed to create bot_user:', userError);
        throw new Error(`Failed to create bot_user: ${userError.message}`);
      }

      botUserId = newUser.id;
      console.log(`[messageOperations] Created new bot_user: ${botUserId}`);
    }

    // Step 2: Save the message
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        bot_id: botId,
        bot_user_id: botUserId,
        message_content: content,
        message_type: type,
        metadata: finalMetadata,
        ip_address: '127.0.0.1',
        user_agent: navigator?.userAgent || 'WebApp'
      })
      .select('id')
      .single();

    if (messageError) {
      console.error('[messageOperations] Failed to save message:', messageError);
      throw new Error(`Failed to save message: ${messageError.message}`);
    }

    console.log(`[messageOperations] Message saved successfully: ${messageData.id}`);

    // Step 3: Update bot_user activity
    await supabase
      .from('bot_users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', botUserId);

    // Step 4: Ensure anonymous session exists if needed
    const { data: anonymousSession } = await supabase
      .from('anonymous_visitor_sessions')
      .select('id')
      .eq('bot_id', botId)
      .eq('session_token', sessionToken)
      .maybeSingle();

    if (!anonymousSession) {
      console.log('[messageOperations] Creating missing anonymous session...');
      await supabase
        .from('anonymous_visitor_sessions')
        .insert({
          bot_id: botId,
          session_token: sessionToken,
          fingerprint_id: null, // Will be filled by other systems
          entry_point: 'message_recovery',
          started_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          is_active: true,
          total_interactions: 1
        });
    } else {
      // Update interaction count
      await supabase
        .from('anonymous_visitor_sessions')
        .update({ 
          last_activity: new Date().toISOString(),
          total_interactions: supabase.rpc('increment_interactions', { session_id: anonymousSession.id })
        })
        .eq('id', anonymousSession.id);
    }

    return messageData.id;
    
  } catch (err) {
    console.error('[messageOperations] Exception in saveChatMessage:', err);
    throw new Error(`Message saving failed: ${err}`);
  }
};

/**
 * Test message retrieval to verify data integrity
 */
export const testMessageRetrieval = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[messageOperations] Testing message retrieval for bot ${botId}`);
    
    const results = {
      totalMessages: 0,
      sessionMessages: 0,
      botUserMessages: 0,
      metadataMessages: 0
    };

    // Test 1: Total messages for bot
    const { data: totalMessages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('bot_id', botId);
    
    results.totalMessages = totalMessages?.length || 0;

    // Test 2: Find bot_user and their messages
    const { data: botUser } = await supabase
      .from('bot_users')
      .select('id')
      .eq('bot_id', botId)
      .eq('session_id', sessionToken)
      .maybeSingle();

    if (botUser) {
      const { data: botUserMessages } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('bot_user_id', botUser.id);
      
      results.botUserMessages = botUserMessages?.length || 0;
    }

    // Test 3: Messages by session in bot_users join
    const { data: sessionMessages } = await supabase
      .from('chat_messages')
      .select(`
        id,
        bot_users!inner(session_id)
      `)
      .eq('bot_id', botId)
      .eq('bot_users.session_id', sessionToken);
    
    results.sessionMessages = sessionMessages?.length || 0;

    // Test 4: Messages by metadata
    const { data: metadataMessages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('bot_id', botId)
      .or(`metadata->>session_token.eq.${sessionToken},metadata->>sessionToken.eq.${sessionToken}`);
    
    results.metadataMessages = metadataMessages?.length || 0;

    console.log('[messageOperations] Retrieval test results:', results);
    return results;
    
  } catch (error) {
    console.error('[messageOperations] Test retrieval failed:', error);
    return null;
  }
};
