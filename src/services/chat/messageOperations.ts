
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Enhanced message saving with corrected session reconciliation
 */
export const saveChatMessage = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: Json = {}
) => {
  try {
    console.log(`[messageOperations] === CORRECTED MESSAGE SAVING ===`);
    console.log(`[messageOperations] Using corrected DB functions without ambiguity`);
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
    
    // Enhanced metadata with corrected tracking
    const baseMetadata = (metadata && typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) ? metadata : {};
    const correctedMetadata = {
      ...baseMetadata,
      session_token: sessionToken,
      sessionToken: sessionToken,
      saved_at: new Date().toISOString(),
      message_type: type,
      platform: 'bot_bj_corrected',
      corrected_system: true,
      save_attempt_id: crypto.randomUUID(),
      debug_info: {
        bot_id: botId,
        session_token: sessionToken,
        saved_timestamp: Date.now(),
        user_agent: navigator?.userAgent || 'unknown',
        url: window?.location?.href || 'unknown',
        system_version: 'corrected_v1'
      }
    };

    console.log(`[messageOperations] Corrected metadata:`, correctedMetadata);

    // Use the corrected save_chat_message function
    const { data, error } = await supabase.rpc('save_chat_message', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_message_content: content,
      p_message_type: type,
      p_metadata: correctedMetadata,
    });

    if (error) {
      console.error('[messageOperations] *** CORRECTED SAVE ERROR ***');
      console.error('[messageOperations] RPC Error:', error);
      console.error('[messageOperations] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      // Enhanced fallback with corrected session reconciliation
      console.log('[messageOperations] Attempting corrected fallback with auto-repair...');
      
      // Use corrected enhanced_session_reconciliation function
      try {
        const { data: reconciledUserId, error: reconcileError } = await supabase.rpc(
          'enhanced_session_reconciliation',
          {
            p_bot_id: botId,
            p_session_token: sessionToken
          }
        );

        if (reconcileError) {
          console.error('[messageOperations] Corrected session reconciliation failed:', reconcileError);
          throw reconcileError;
        }

        console.log('[messageOperations] Corrected session reconciliation successful:', reconciledUserId);

        // Retry the save with corrected system
        const { data: retryData, error: retryError } = await supabase.rpc('save_chat_message', {
          p_bot_id: botId,
          p_session_token: sessionToken,
          p_message_content: content,
          p_message_type: type,
          p_metadata: { ...correctedMetadata, corrected_reconciled: true },
        });
        
        if (!retryError && retryData) {
          console.log('[messageOperations] *** MESSAGE SAVED AFTER CORRECTED RECONCILIATION ***');
          return retryData;
        }
      } catch (reconcileErr) {
        console.warn('[messageOperations] Corrected reconciliation failed:', reconcileErr);
      }
      
      return await saveMessageWithCorrectedReconciliation(botId, sessionToken, content, type, correctedMetadata);
    }

    console.log('[messageOperations] *** CORRECTED MESSAGE SAVED SUCCESSFULLY ***');
    console.log('[messageOperations] Message ID:', data);
    console.log('[messageOperations] Corrected session reconciliation completed without ambiguity');
    
    return data;
  } catch (err) {
    console.error('[messageOperations] *** EXCEPTION IN CORRECTED saveChatMessage ***');
    console.error('[messageOperations] Exception:', err);
    
    // Emergency fallback with corrected functions
    try {
      console.log('[messageOperations] Attempting corrected emergency fallback...');
      return await saveMessageWithCorrectedReconciliation(botId, sessionToken, content, type, metadata as any);
    } catch (fallbackErr) {
      console.error('[messageOperations] Corrected emergency fallback failed:', fallbackErr);
      throw new Error(`Message saving failed completely with corrected system: ${fallbackErr}`);
    }
  }
};

/**
 * Fallback with corrected session reconciliation
 */
const saveMessageWithCorrectedReconciliation = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: any
) => {
  console.log('[messageOperations] === CORRECTED FALLBACK WITH RECONCILIATION ===');
  
  // Use the corrected enhanced_session_reconciliation function
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
      console.error('[messageOperations] Corrected reconciliation failed:', reconcileError);
      throw reconcileError;
    }

    botUserId = reconciledUserId;
    console.log('[messageOperations] Corrected reconciliation successful:', botUserId);
  } catch (reconcileErr) {
    console.error('[messageOperations] Corrected reconciliation failed:', reconcileErr);
    throw new Error(`Corrected session reconciliation failed: ${reconcileErr}`);
  }

  // Insert message directly with corrected reconciled session
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      bot_id: botId,
      bot_user_id: botUserId,
      message_content: content,
      message_type: type,
      metadata: {
        ...metadata,
        corrected_fallback: true,
        reconciliation_method: 'corrected_enhanced',
        fallback_timestamp: new Date().toISOString()
      }
    })
    .select('id')
    .single();

  if (error) {
    console.error('[messageOperations] Corrected direct insert failed:', error);
    throw error;
  }

  console.log('[messageOperations] Corrected direct insert successful:', data.id);
  return data.id;
};
