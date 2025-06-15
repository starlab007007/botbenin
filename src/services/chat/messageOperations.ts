
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Saves a chat message with enhanced session reconciliation and error handling
 */
export const saveChatMessage = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: Json = {}
) => {
  try {
    console.log(`[messageOperations] === ENHANCED MESSAGE SAVING ===`);
    console.log(`[messageOperations] Bot ID: ${botId}`);
    console.log(`[messageOperations] Session Token: ${sessionToken}`);
    console.log(`[messageOperations] Message Type: ${type}`);
    console.log(`[messageOperations] Content Preview: ${content.substring(0, 100)}...`);
    
    // Validation des paramètres d'entrée
    if (!botId || !sessionToken || !content || !type) {
      console.error('[messageOperations] Missing required parameters:', { botId, sessionToken, content, type });
      return null;
    }

    if (!sessionToken.startsWith('anon_')) {
      console.warn('[messageOperations] Unexpected session token format:', sessionToken);
    }
    
    // Enrichir les métadonnées
    const baseMetadata = (metadata && typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) ? metadata : {};
    const enrichedMetadata = {
      ...baseMetadata,
      session_token: sessionToken,
      sessionToken: sessionToken,
      saved_at: new Date().toISOString(),
      message_type: type,
      platform: 'bot_bj',
      enhanced_reconciliation: true,
      save_attempt_id: crypto.randomUUID(),
      debug_info: {
        bot_id: botId,
        session_token: sessionToken,
        saved_timestamp: Date.now(),
        user_agent: navigator?.userAgent || 'unknown',
        url: window?.location?.href || 'unknown'
      }
    };

    console.log(`[messageOperations] Enhanced metadata:`, enrichedMetadata);

    // Utiliser la fonction RPC améliorée
    const { data, error } = await supabase.rpc('save_chat_message', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_message_content: content,
      p_message_type: type,
      p_metadata: enrichedMetadata,
    });

    if (error) {
      console.error('[messageOperations] *** SAVE ERROR ***');
      console.error('[messageOperations] RPC Error:', error);
      console.error('[messageOperations] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      // Tentative de fallback avec insertion directe
      console.log('[messageOperations] Attempting direct insert fallback...');
      return await saveMessageDirectFallback(botId, sessionToken, content, type, enrichedMetadata);
    }

    console.log('[messageOperations] *** MESSAGE SAVED SUCCESSFULLY ***');
    console.log('[messageOperations] Message ID:', data);
    console.log('[messageOperations] Session reconciliation completed');
    
    return data;
  } catch (err) {
    console.error('[messageOperations] *** EXCEPTION IN saveChatMessage ***');
    console.error('[messageOperations] Exception:', err);
    
    // Dernière tentative avec insertion directe
    try {
      console.log('[messageOperations] Attempting emergency direct insert...');
      return await saveMessageDirectFallback(botId, sessionToken, content, type, metadata as any);
    } catch (fallbackErr) {
      console.error('[messageOperations] Emergency fallback failed:', fallbackErr);
      return null;
    }
  }
};

/**
 * Fallback direct pour sauvegarder un message si la RPC échoue
 */
const saveMessageDirectFallback = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: any
) => {
  console.log('[messageOperations] === DIRECT INSERT FALLBACK ===');
  
  // D'abord, s'assurer qu'un bot_user existe
  let botUserId = await ensureBotUserExists(botId, sessionToken);
  
  if (!botUserId) {
    throw new Error('Could not create or find bot_user for session');
  }

  // Insérer le message directement
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      bot_id: botId,
      bot_user_id: botUserId,
      message_content: content,
      message_type: type,
      metadata: {
        ...metadata,
        fallback_save: true,
        fallback_timestamp: new Date().toISOString()
      }
    })
    .select('id')
    .single();

  if (error) {
    console.error('[messageOperations] Direct insert failed:', error);
    throw error;
  }

  console.log('[messageOperations] Direct insert successful:', data.id);
  return data.id;
};

/**
 * S'assurer qu'un bot_user existe pour la session
 */
const ensureBotUserExists = async (botId: string, sessionToken: string) => {
  // Chercher un bot_user existant
  const { data: existingUser, error: searchError } = await supabase
    .from('bot_users')
    .select('id')
    .eq('bot_id', botId)
    .eq('session_id', sessionToken)
    .single();

  if (!searchError && existingUser) {
    console.log('[messageOperations] Found existing bot_user:', existingUser.id);
    return existingUser.id;
  }

  // Créer un nouveau bot_user
  const { data: newUser, error: createError } = await supabase
    .from('bot_users')
    .insert({
      bot_id: botId,
      session_id: sessionToken,
      user_name: 'Session ' + sessionToken.slice(0, 8),
      is_authenticated: false,
      last_active: new Date().toISOString()
    })
    .select('id')
    .single();

  if (createError) {
    console.error('[messageOperations] Failed to create bot_user:', createError);
    return null;
  }

  console.log('[messageOperations] Created new bot_user:', newUser.id);
  return newUser.id;
};
