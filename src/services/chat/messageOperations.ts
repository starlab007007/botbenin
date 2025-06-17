
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Enhanced message saving with improved session reconciliation and error handling
 */
export const saveChatMessage = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: Json = {}
) => {
  try {
    console.log(`[messageOperations] === ENHANCED MESSAGE SAVING (UNIFIED) ===`);
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
    
    // Enhanced metadata with unified tracking
    const baseMetadata = (metadata && typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) ? metadata : {};
    const unifiedMetadata = {
      ...baseMetadata,
      session_token: sessionToken,
      sessionToken: sessionToken,
      saved_at: new Date().toISOString(),
      message_type: type,
      platform: 'bot_bj_unified',
      unified_system: true,
      save_attempt_id: crypto.randomUUID(),
      debug_info: {
        bot_id: botId,
        session_token: sessionToken,
        saved_timestamp: Date.now(),
        user_agent: navigator?.userAgent || 'unknown',
        url: window?.location?.href || 'unknown',
        system_version: 'unified_v2'
      }
    };

    console.log(`[messageOperations] Unified metadata:`, unifiedMetadata);

    // Use the improved save_chat_message function with enhanced error handling
    const { data, error } = await supabase.rpc('save_chat_message', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_message_content: content,
      p_message_type: type,
      p_metadata: unifiedMetadata,
    });

    if (error) {
      console.error('[messageOperations] *** UNIFIED SAVE ERROR ***');
      console.error('[messageOperations] RPC Error:', error);
      console.error('[messageOperations] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      // Enhanced fallback with session reconciliation and auto-repair
      console.log('[messageOperations] Attempting enhanced fallback with auto-repair...');
      
      // Tenter un diagnostic et réparation automatique d'abord
      try {
        await supabase.rpc('auto_fix_session_issues', { p_bot_id: botId });
        console.log('[messageOperations] Auto-repair completed, retrying save...');
        
        // Réessayer la sauvegarde après réparation
        const { data: retryData, error: retryError } = await supabase.rpc('save_chat_message', {
          p_bot_id: botId,
          p_session_token: sessionToken,
          p_message_content: content,
          p_message_type: type,
          p_metadata: { ...unifiedMetadata, auto_repaired: true },
        });
        
        if (!retryError && retryData) {
          console.log('[messageOperations] *** MESSAGE SAVED AFTER AUTO-REPAIR ***');
          return retryData;
        }
      } catch (autoRepairError) {
        console.warn('[messageOperations] Auto-repair failed:', autoRepairError);
      }
      
      return await saveMessageWithReconciliation(botId, sessionToken, content, type, unifiedMetadata);
    }

    console.log('[messageOperations] *** UNIFIED MESSAGE SAVED SUCCESSFULLY ***');
    console.log('[messageOperations] Message ID:', data);
    console.log('[messageOperations] Enhanced session reconciliation completed');
    
    return data;
  } catch (err) {
    console.error('[messageOperations] *** EXCEPTION IN UNIFIED saveChatMessage ***');
    console.error('[messageOperations] Exception:', err);
    
    // Enhanced emergency fallback with auto-repair
    try {
      console.log('[messageOperations] Attempting enhanced emergency fallback with auto-repair...');
      
      // Tenter d'abord un auto-repair
      await supabase.rpc('auto_fix_session_issues', { p_bot_id: botId });
      
      return await saveMessageWithReconciliation(botId, sessionToken, content, type, metadata as any);
    } catch (fallbackErr) {
      console.error('[messageOperations] Enhanced emergency fallback failed:', fallbackErr);
      throw new Error(`Message saving failed completely: ${fallbackErr}`);
    }
  }
};

/**
 * Enhanced fallback with session reconciliation using the new enhanced function
 */
const saveMessageWithReconciliation = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: any
) => {
  console.log('[messageOperations] === ENHANCED FALLBACK WITH RECONCILIATION ===');
  
  // Use the enhanced session reconciliation function
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
      console.error('[messageOperations] Enhanced session reconciliation failed:', reconcileError);
      throw reconcileError;
    }

    botUserId = reconciledUserId;
    console.log('[messageOperations] Enhanced session reconciliation successful:', botUserId);
  } catch (reconcileErr) {
    console.error('[messageOperations] Enhanced reconciliation failed:', reconcileErr);
    throw new Error(`Enhanced session reconciliation failed: ${reconcileErr}`);
  }

  // Insert message directly with reconciled session
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      bot_id: botId,
      bot_user_id: botUserId,
      message_content: content,
      message_type: type,
      metadata: {
        ...metadata,
        enhanced_fallback: true,
        reconciliation_method: 'enhanced_v2',
        fallback_timestamp: new Date().toISOString()
      }
    })
    .select('id')
    .single();

  if (error) {
    console.error('[messageOperations] Enhanced direct insert failed:', error);
    throw error;
  }

  console.log('[messageOperations] Enhanced direct insert successful:', data.id);
  return data.id;
};
