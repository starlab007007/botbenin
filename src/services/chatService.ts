
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Saves a chat message to the database using the 'save_chat_message' RPC function.
 * This function is designed to not throw errors to avoid disrupting the chat flow.
 * Errors are logged to the console for debugging.
 *
 * @param botId - The UUID of the bot.
 * @param sessionToken - The session token for the user.
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
    console.log(`[chatService] Saving message for bot ${botId}, session ${sessionToken}`);
    
    // S'assurer que le session_token est bien inclus dans les métadonnées
    const baseMetadata = (metadata && typeof metadata === 'object' && metadata !== null) ? metadata : {};
    const enrichedMetadata = {
      ...baseMetadata,
      session_token: sessionToken,
      sessionToken: sessionToken, // Double sécurité
      saved_at: new Date().toISOString()
    };

    const { data, error } = await supabase.rpc('save_chat_message', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_message_content: content,
      p_message_type: type,
      p_metadata: enrichedMetadata,
    });

    if (error) {
      console.error('Error saving chat message via RPC:', error);
      return null;
    }

    console.log('Chat message saved successfully, ID:', data);
    console.log('Session token used:', sessionToken);
    return data;
  } catch (err) {
    console.error('Exception in saveChatMessage:', err);
    return null;
  }
};

/**
 * Fonction de debug pour analyser les tokens de session en base
 * Note: Cette fonction est désactivée car la fonction RPC n'existe pas dans les types
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
      console.error('Error in debugSessionTokens:', error);
      return null;
    }

    console.log('=== DEBUG SESSION TOKENS ===');
    console.table(data);
    return data;
  } catch (err) {
    console.error('Exception in debugSessionTokens:', err);
    return null;
  }
};
