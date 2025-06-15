
import { supabase } from '@/integrations/supabase/client';
import { type Json } from '@supabase/supabase-js';

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
    const { data, error } = await supabase.rpc('save_chat_message', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_message_content: content,
      p_message_type: type,
      p_metadata: metadata,
    });

    if (error) {
      console.error('Error saving chat message via RPC:', error);
      return null;
    }

    console.log('Chat message saved successfully, ID:', data);
    return data;
  } catch (err) {
    console.error('Exception in saveChatMessage:', err);
    return null;
  }
};
