
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Saves a chat message to the database using the improved 'save_chat_message' RPC function.
 * This function now uses enhanced session reconciliation for better reliability.
 * Errors are logged to the console for debugging.
 *
 * @param botId - The UUID of the bot.
 * @param sessionToken - The unified session token for the user.
 * @param content - The content of the message.
 * @param type - The type of message, either 'user' or 'bot'.
 * @param metadata - Optional metadata to store with the message.
 * @returns The UUID of the saved message, or null if an error occurred.
 */
export const saveChatMessage = async (
  botId: string,
  sessionToken: string,
  content: string,
  type: 'user' | 'bot',
  metadata: Json = {}
) => {
  try {
    console.log(`[messageOperations] === SAVING MESSAGE WITH ENHANCED RECONCILIATION ===`);
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
      console.warn('[messageOperations] Invalid session token format:', sessionToken);
    }
    
    // Enrichir les métadonnées avec le token de session
    const baseMetadata = (metadata && typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) ? metadata : {};
    const enrichedMetadata = {
      ...baseMetadata,
      session_token: sessionToken,
      sessionToken: sessionToken, // Double sécurité
      saved_at: new Date().toISOString(),
      message_type: type,
      platform: 'bot_bj',
      enhanced_reconciliation: true,
      debug_info: {
        bot_id: botId,
        session_token: sessionToken,
        saved_timestamp: Date.now()
      }
    };

    console.log(`[messageOperations] Enhanced metadata:`, enrichedMetadata);

    // Utiliser la fonction améliorée save_chat_message
    const { data, error } = await supabase.rpc('save_chat_message', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_message_content: content,
      p_message_type: type,
      p_metadata: enrichedMetadata,
    });

    if (error) {
      console.error('[messageOperations] *** ERROR SAVING MESSAGE ***');
      console.error('[messageOperations] RPC Error:', error);
      console.error('[messageOperations] RPC parameters were:', {
        p_bot_id: botId,
        p_session_token: sessionToken,
        p_message_content: content.substring(0, 100) + '...',
        p_message_type: type
      });
      return null;
    }

    console.log('[messageOperations] *** MESSAGE SAVED SUCCESSFULLY WITH ENHANCED RECONCILIATION ***');
    console.log('[messageOperations] Message ID:', data);
    console.log('[messageOperations] Session token used:', sessionToken);
    
    return data;
  } catch (err) {
    console.error('[messageOperations] *** EXCEPTION IN saveChatMessage ***');
    console.error('[messageOperations] Exception:', err);
    return null;
  }
};
