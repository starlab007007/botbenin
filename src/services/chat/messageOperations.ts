
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Enhanced message saving with final corrected secure session reconciliation
 */
export const saveChatMessage = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: Json = {}
) => {
  try {
    console.log(`[messageOperations] === SECURE MESSAGE SAVING (FINAL CORRECTED) ===`);
    console.log(`[messageOperations] Using final corrected secure DB functions`);
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
    
    // Enhanced metadata with final corrected secure tracking
    const baseMetadata = (metadata && typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) ? metadata : {};
    const secureMetadata = {
      ...baseMetadata,
      session_token: sessionToken,
      sessionToken: sessionToken,
      saved_at: new Date().toISOString(),
      message_type: type,
      platform: 'bot_bj_secure_final',
      secure_system: true,
      final_correction_applied: true,
      save_attempt_id: crypto.randomUUID(),
      debug_info: {
        bot_id: botId,
        session_token: sessionToken,
        saved_timestamp: Date.now(),
        user_agent: navigator?.userAgent || 'unknown',
        url: window?.location?.href || 'unknown',
        system_version: 'secure_final_v1'
      }
    };

    console.log(`[messageOperations] Final corrected metadata:`, secureMetadata);

    // Use the final corrected secure save_chat_message function
    const { data, error } = await supabase.rpc('save_chat_message', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_message_content: content,
      p_message_type: type,
      p_metadata: secureMetadata,
    });

    if (error) {
      console.error('[messageOperations] *** FINAL CORRECTED SAVE ERROR ***');
      console.error('[messageOperations] RPC Error:', error);
      console.error('[messageOperations] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      // Enhanced fallback with final corrected secure session reconciliation
      console.log('[messageOperations] Attempting final corrected fallback with auto-repair...');
      
      // Use final corrected enhanced_session_reconciliation function
      try {
        const { data: reconciledUserId, error: reconcileError } = await supabase.rpc(
          'enhanced_session_reconciliation',
          {
            p_bot_id: botId,
            p_session_token: sessionToken
          }
        );

        if (reconcileError) {
          console.error('[messageOperations] Final corrected session reconciliation failed:', reconcileError);
          throw reconcileError;
        }

        console.log('[messageOperations] Final corrected session reconciliation successful:', reconciledUserId);

        // Retry the save with final corrected system
        const { data: retryData, error: retryError } = await supabase.rpc('save_chat_message', {
          p_bot_id: botId,
          p_session_token: sessionToken,
          p_message_content: content,
          p_message_type: type,
          p_metadata: { ...secureMetadata, final_corrected_reconciled: true },
        });
        
        if (!retryError && retryData) {
          console.log('[messageOperations] *** MESSAGE SAVED AFTER FINAL CORRECTED RECONCILIATION ***');
          return retryData;
        }
      } catch (reconcileErr) {
        console.warn('[messageOperations] Final corrected reconciliation failed:', reconcileErr);
      }
      
      return await saveMessageWithFinalCorrectedReconciliation(botId, sessionToken, content, type, secureMetadata);
    }

    console.log('[messageOperations] *** FINAL CORRECTED MESSAGE SAVED SUCCESSFULLY ***');
    console.log('[messageOperations] Message ID:', data);
    console.log('[messageOperations] Final corrected session reconciliation completed');
    
    return data;
  } catch (err) {
    console.error('[messageOperations] *** EXCEPTION IN FINAL CORRECTED saveChatMessage ***');
    console.error('[messageOperations] Exception:', err);
    
    // Emergency fallback with final corrected secure functions
    try {
      console.log('[messageOperations] Attempting final corrected emergency fallback...');
      return await saveMessageWithFinalCorrectedReconciliation(botId, sessionToken, content, type, metadata as any);
    } catch (fallbackErr) {
      console.error('[messageOperations] Final corrected emergency fallback failed:', fallbackErr);
      throw new Error(`Message saving failed completely with final corrected system: ${fallbackErr}`);
    }
  }
};

/**
 * Fallback with final corrected secure session reconciliation
 */
const saveMessageWithFinalCorrectedReconciliation = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: any
) => {
  console.log('[messageOperations] === FINAL CORRECTED FALLBACK WITH RECONCILIATION ===');
  
  // Use the final corrected secure enhanced_session_reconciliation function
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
      console.error('[messageOperations] Final corrected reconciliation failed:', reconcileError);
      throw reconcileError;
    }

    botUserId = reconciledUserId;
    console.log('[messageOperations] Final corrected reconciliation successful:', botUserId);
  } catch (reconcileErr) {
    console.error('[messageOperations] Final corrected reconciliation failed:', reconcileErr);
    throw new Error(`Final corrected session reconciliation failed: ${reconcileErr}`);
  }

  // Insert message directly with final corrected reconciled session (RLS will apply)
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      bot_id: botId,
      bot_user_id: botUserId,
      message_content: content,
      message_type: type,
      metadata: {
        ...metadata,
        final_corrected_fallback: true,
        reconciliation_method: 'final_corrected_enhanced',
        fallback_timestamp: new Date().toISOString()
      }
    })
    .select('id')
    .single();

  if (error) {
    console.error('[messageOperations] Final corrected direct insert failed:', error);
    throw error;
  }

  console.log('[messageOperations] Final corrected direct insert successful:', data.id);
  return data.id;
};
