
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Saves a chat message to the database using the improved 'save_chat_message' RPC function.
 * This function is designed to not throw errors to avoid disrupting the chat flow.
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
    console.log(`[chatService] Saving message for bot ${botId}, session ${sessionToken}, type: ${type}`);
    
    // Validation des paramètres d'entrée
    if (!botId || !sessionToken || !content || !type) {
      console.error('[chatService] Missing required parameters:', { botId, sessionToken, content, type });
      return null;
    }

    if (!sessionToken.startsWith('anon_')) {
      console.warn('[chatService] Invalid session token format:', sessionToken);
    }
    
    // Enrichir les métadonnées avec le token de session
    const baseMetadata = (metadata && typeof metadata === 'object' && metadata !== null) ? metadata : {};
    const enrichedMetadata = {
      ...baseMetadata,
      session_token: sessionToken,
      sessionToken: sessionToken, // Double sécurité
      saved_at: new Date().toISOString(),
      message_type: type,
      platform: 'bot_bj'
    };

    console.log(`[chatService] Calling save_chat_message RPC with enriched metadata`);

    const { data, error } = await supabase.rpc('save_chat_message', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_message_content: content,
      p_message_type: type,
      p_metadata: enrichedMetadata,
    });

    if (error) {
      console.error('[chatService] Error saving chat message via RPC:', error);
      console.error('[chatService] RPC parameters were:', {
        p_bot_id: botId,
        p_session_token: sessionToken,
        p_message_content: content.substring(0, 100) + '...',
        p_message_type: type
      });
      return null;
    }

    console.log('[chatService] Chat message saved successfully, ID:', data);
    console.log('[chatService] Session token used:', sessionToken);
    return data;
  } catch (err) {
    console.error('[chatService] Exception in saveChatMessage:', err);
    return null;
  }
};

/**
 * Fonction de debug pour analyser les tokens de session en base
 */
export const debugSessionTokens = async (botId: string) => {
  try {
    console.log(`[chatService] Debug session tokens called for bot ${botId}`);
    
    // Recherche directe des messages récents pour debug
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        metadata,
        message_type,
        created_at,
        bot_users!inner(session_id)
      `)
      .eq('bot_id', botId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[chatService] Error in debugSessionTokens:', error);
      return null;
    }

    console.log('[chatService] === DEBUG SESSION TOKENS ===');
    console.table(data);
    return data;
  } catch (err) {
    console.error('[chatService] Exception in debugSessionTokens:', err);
    return null;
  }
};
