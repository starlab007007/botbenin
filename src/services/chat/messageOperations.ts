
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Enhanced message saving with multiple fallback strategies
 */
export const saveChatMessage = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: Json = {}
) => {
  try {
    console.log(`[messageOperations] === COMPREHENSIVE MESSAGE SAVING ===`);
    console.log(`[messageOperations] Bot ID: ${botId}`);
    console.log(`[messageOperations] Session Token: ${sessionToken}`);
    console.log(`[messageOperations] Message Type: ${type}`);
    
    // Enhanced parameter validation
    if (!botId || !sessionToken || !content || !type) {
      console.error('[messageOperations] Missing required parameters:', { botId, sessionToken, content, type });
      throw new Error('Missing required parameters for message saving');
    }
    
    // Enhanced metadata
    const baseMetadata = (metadata && typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) ? metadata : {};
    const finalMetadata = {
      ...baseMetadata,
      session_token: sessionToken,
      sessionToken: sessionToken,
      saved_at: new Date().toISOString(),
      message_type: type,
      platform: 'bot_bj_comprehensive_system',
      comprehensive_system: true,
      save_attempt_id: crypto.randomUUID(),
      debug_info: {
        bot_id: botId,
        session_token: sessionToken,
        saved_timestamp: Date.now(),
        user_agent: navigator?.userAgent || 'unknown',
        url: window?.location?.href || 'unknown',
        system_version: 'comprehensive_system_v1'
      }
    };

    // Strategy 1: Try corrected final system
    try {
      const { data: finalData, error: finalError } = await supabase.rpc('save_message_final', {
        p_bot_id: botId,
        p_session_token: sessionToken,
        p_message_content: content,
        p_message_type: type,
        p_metadata: finalMetadata,
      });

      if (!finalError && finalData) {
        console.log('[messageOperations] Final system save successful');
        return finalData;
      }
    } catch (finalErr) {
      console.warn('[messageOperations] Final system failed, trying alternative:', finalErr);
    }

    // Strategy 2: Try manual session reconciliation + direct insert
    let botUserId;
    try {
      // Try to find or create bot_user
      const { data: existingUser } = await supabase
        .from('bot_users')
        .select('id')
        .eq('bot_id', botId)
        .eq('session_id', sessionToken)
        .maybeSingle();

      if (existingUser) {
        botUserId = existingUser.id;
      } else {
        // Create new bot_user
        const { data: newUser, error: userError } = await supabase
          .from('bot_users')
          .insert({
            bot_id: botId,
            session_id: sessionToken,
            user_name: 'Session User',
            is_authenticated: false,
            last_active: new Date().toISOString()
          })
          .select('id')
          .single();

        if (!userError && newUser) {
          botUserId = newUser.id;
        }
      }

      if (botUserId) {
        // Direct insert into chat_messages
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

        if (!messageError && messageData) {
          console.log('[messageOperations] Direct insert successful');
          return messageData.id;
        }
      }
    } catch (directErr) {
      console.warn('[messageOperations] Direct insert failed:', directErr);
    }

    // Strategy 3: Use auto-reconcile function
    try {
      const reconcileUserId = await supabase.rpc('auto_reconcile_session_token', {
        p_bot_id: botId,
        p_session_token: sessionToken
      });

      if (reconcileUserId.data) {
        const { data: reconcileMessage, error: reconcileError } = await supabase
          .from('chat_messages')
          .insert({
            bot_id: botId,
            bot_user_id: reconcileUserId.data,
            message_content: content,
            message_type: type,
            metadata: finalMetadata,
            ip_address: '127.0.0.1',
            user_agent: navigator?.userAgent || 'WebApp'
          })
          .select('id')
          .single();

        if (!reconcileError && reconcileMessage) {
          console.log('[messageOperations] Reconcile save successful');
          return reconcileMessage.id;
        }
      }
    } catch (reconcileErr) {
      console.warn('[messageOperations] Reconcile save failed:', reconcileErr);
    }

    throw new Error('All message saving strategies failed');
    
  } catch (err) {
    console.error('[messageOperations] Exception in comprehensive saveChatMessage:', err);
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
      final_system: 0,
      standard_system: 0,
      direct_query: 0,
      enhanced_sessions: 0,
      anonymous_sessions: 0
    };

    // Test final system
    try {
      const { data: finalData } = await supabase.rpc('get_chat_history_final', {
        p_bot_id: botId,
        p_session_token: sessionToken,
        p_bot_user_id: null,
        p_limit: 100
      });
      results.final_system = finalData?.length || 0;
    } catch (e) { /* ignore */ }

    // Test standard system
    try {
      const { data: standardData } = await supabase.rpc('get_chat_history', {
        p_bot_id: botId,
        p_session_token: sessionToken
      });
      results.standard_system = standardData?.length || 0;
    } catch (e) { /* ignore */ }

    // Test direct query
    try {
      const { data: directData } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('bot_id', botId);
      results.direct_query = directData?.length || 0;
    } catch (e) { /* ignore */ }

    // Test enhanced sessions
    try {
      const { data: enhancedData } = await supabase
        .from('enhanced_chat_sessions')
        .select('id')
        .eq('bot_id', botId);
      results.enhanced_sessions = enhancedData?.length || 0;
    } catch (e) { /* ignore */ }

    // Test anonymous sessions
    try {
      const { data: anonymousData } = await supabase
        .from('anonymous_visitor_sessions')
        .select('id')
        .eq('bot_id', botId);
      results.anonymous_sessions = anonymousData?.length || 0;
    } catch (e) { /* ignore */ }

    console.log('[messageOperations] Retrieval test results:', results);
    return results;
    
  } catch (error) {
    console.error('[messageOperations] Test retrieval failed:', error);
    return null;
  }
};
