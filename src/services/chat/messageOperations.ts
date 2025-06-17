
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Enhanced message saving with corrected secure session reconciliation
 */
export const saveChatMessage = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: Json = {}
) => {
  try {
    console.log(`[messageOperations] === SECURE MESSAGE SAVING ===`);
    console.log(`[messageOperations] Using corrected secure DB functions`);
    console.log(`[messageOperations] Bot ID: ${botId}`);
    console.log(`[messageOperations] Session Token: ${sessionToken}`);
    console.log(`[messageOperations] Message Type: ${type}`);
    console.log(`[messageOperations] Content Preview: ${content.substring(0, 100)}...`);
    
    // Enhanced parameter validation
    if (!botId || !sessionToken || !content || !type) {
      console.error('[messageOperations] Missing required parameters:', { botId, sessionToken, content, type });
      throw new Error('Missing required parameters for message saving');
    }

    if (!sessionToken.startsWith('anon_')) {
      console.warn('[messageOperations] Unexpected session token format:', sessionToken);
    }
    
    // Enhanced metadata with secure tracking
    const baseMetadata = (metadata && typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) ? metadata : {};
    const secureMetadata = {
      ...baseMetadata,
      session_token: sessionToken,
      sessionToken: sessionToken,
      saved_at: new Date().toISOString(),
      message_type: type,
      platform: 'bot_bj_secure',
      secure_system: true,
      save_attempt_id: crypto.randomUUID(),
      debug_info: {
        bot_id: botId,
        session_token: sessionToken,
        saved_timestamp: Date.now(),
        user_agent: navigator?.userAgent || 'unknown',
        url: window?.location?.href || 'unknown',
        system_version: 'secure_v1'
      }
    };

    console.log(`[messageOperations] Secure metadata:`, secureMetadata);

    // Use the corrected secure save_chat_message function
    const { data, error } = await supabase.rpc('save_chat_message', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_message_content: content,
      p_message_type: type,
      p_metadata: secureMetadata,
    });

    if (error) {
      console.error('[messageOperations] *** SECURE SAVE ERROR ***');
      console.error('[messageOperations] RPC Error:', error);
      console.error('[messageOperations] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      // Enhanced fallback with secure session reconciliation
      console.log('[messageOperations] Attempting secure fallback with auto-repair...');
      
      // Use secure enhanced_session_reconciliation function
      try {
        const { data: reconciledUserId, error: reconcileError } = await supabase.rpc(
          'enhanced_session_reconciliation',
          {
            p_bot_id: botId,
            p_session_token: sessionToken
          }
        );

        if (reconcileError) {
          console.error('[messageOperations] Secure session reconciliation failed:', reconcileError);
          throw reconcileError;
        }

        console.log('[messageOperations] Secure session reconciliation successful:', reconciledUserId);

        // Retry the save with secure system
        const { data: retryData, error: retryError } = await supabase.rpc('save_chat_message', {
          p_bot_id: botId,
          p_session_token: sessionToken,
          p_message_content: content,
          p_message_type: type,
          p_metadata: { ...secureMetadata, secure_reconciled: true },
        });
        
        if (!retryError && retryData) {
          console.log('[messageOperations] *** MESSAGE SAVED AFTER SECURE RECONCILIATION ***');
          return retryData;
        }
      } catch (reconcileErr) {
        console.warn('[messageOperations] Secure reconciliation failed:', reconcileErr);
      }
      
      return await saveMessageWithSecureReconciliation(botId, sessionToken, content, type, secureMetadata);
    }

    console.log('[messageOperations] *** SECURE MESSAGE SAVED SUCCESSFULLY ***');
    console.log('[messageOperations] Message ID:', data);
    console.log('[messageOperations] Secure session reconciliation completed');
    
    return data;
  } catch (err) {
    console.error('[messageOperations] *** EXCEPTION IN SECURE saveChatMessage ***');
    console.error('[messageOperations] Exception:', err);
    
    // Emergency fallback with secure functions
    try {
      console.log('[messageOperations] Attempting secure emergency fallback...');
      return await saveMessageWithSecureReconciliation(botId, sessionToken, content, type, metadata as any);
    } catch (fallbackErr) {
      console.error('[messageOperations] Secure emergency fallback failed:', fallbackErr);
      throw new Error(`Message saving failed completely with secure system: ${fallbackErr}`);
    }
  }
};

/**
 * Fallback with corrected secure session reconciliation
 */
const saveMessageWithSecureReconciliation = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: any
) => {
  console.log('[messageOperations] === SECURE FALLBACK WITH RECONCILIATION ===');
  
  // Use the corrected secure enhanced_session_reconciliation function
  let botUserId: string;
  try {
    const { data: reconciledUserId, error: reconcileError } = await supabase.rpc(
      'enhanced_session_reconciliation',
      {
        p_bot_id: botId,
        p_session_token: sessionToken
      }
    );

    if (reconcileError) {
      console.error('[messageOperations] Secure reconciliation failed:', reconcileError);
      throw reconcileError;
    }

    botUserId = reconciledUserId;
    console.log('[messageOperations] Secure reconciliation successful:', botUserId);
  } catch (reconcileErr) {
    console.error('[messageOperations] Secure reconciliation failed:', reconcileErr);
    throw new Error(`Secure session reconciliation failed: ${reconcileErr}`);
  }

  // Insert message directly with secure reconciled session (RLS will apply)
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      bot_id: botId,
      bot_user_id: botUserId,
      message_content: content,
      message_type: type,
      metadata: {
        ...metadata,
        secure_fallback: true,
        reconciliation_method: 'secure_enhanced',
        fallback_timestamp: new Date().toISOString()
      }
    })
    .select('id')
    .single();

  if (error) {
    console.error('[messageOperations] Secure direct insert failed:', error);
    throw error;
  }

  console.log('[messageOperations] Secure direct insert successful:', data.id);
  return data.id;
};
