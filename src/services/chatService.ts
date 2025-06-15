
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
    console.log(`[chatService] === SAVING MESSAGE WITH ENHANCED RECONCILIATION ===`);
    console.log(`[chatService] Bot ID: ${botId}`);
    console.log(`[chatService] Session Token: ${sessionToken}`);
    console.log(`[chatService] Message Type: ${type}`);
    console.log(`[chatService] Content Preview: ${content.substring(0, 100)}...`);
    
    // Validation des paramètres d'entrée
    if (!botId || !sessionToken || !content || !type) {
      console.error('[chatService] Missing required parameters:', { botId, sessionToken, content, type });
      return null;
    }

    if (!sessionToken.startsWith('anon_')) {
      console.warn('[chatService] Invalid session token format:', sessionToken);
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

    console.log(`[chatService] Enhanced metadata:`, enrichedMetadata);

    // Utiliser la fonction améliorée save_chat_message
    const { data, error } = await supabase.rpc('save_chat_message', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_message_content: content,
      p_message_type: type,
      p_metadata: enrichedMetadata,
    });

    if (error) {
      console.error('[chatService] *** ERROR SAVING MESSAGE ***');
      console.error('[chatService] RPC Error:', error);
      console.error('[chatService] RPC parameters were:', {
        p_bot_id: botId,
        p_session_token: sessionToken,
        p_message_content: content.substring(0, 100) + '...',
        p_message_type: type
      });
      return null;
    }

    console.log('[chatService] *** MESSAGE SAVED SUCCESSFULLY WITH ENHANCED RECONCILIATION ***');
    console.log('[chatService] Message ID:', data);
    console.log('[chatService] Session token used:', sessionToken);
    
    return data;
  } catch (err) {
    console.error('[chatService] *** EXCEPTION IN saveChatMessage ***');
    console.error('[chatService] Exception:', err);
    return null;
  }
};

/**
 * Fonction améliorée pour récupérer l'historique des messages avec la nouvelle fonction optimisée
 */
export const getChatHistory = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[chatService] === GETTING CHAT HISTORY WITH ENHANCED FUNCTION ===`);
    console.log(`[chatService] Bot ID: ${botId}`);
    console.log(`[chatService] Session Token: ${sessionToken}`);
    
    const { data, error } = await supabase.rpc('get_chat_history', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null,
    });

    if (error) {
      console.error('[chatService] Error in getChatHistory:', error);
      return null;
    }

    console.log(`[chatService] Enhanced chat history retrieved: ${data?.length || 0} messages`);
    return data;
  } catch (err) {
    console.error('[chatService] Exception in getChatHistory:', err);
    return null;
  }
};

/**
 * Fonction pour nettoyer et consolider les données de chat
 */
export const cleanupChatData = async (botId?: string) => {
  try {
    console.log(`[chatService] === CLEANING UP CHAT DATA ===`);
    console.log(`[chatService] Bot ID: ${botId || 'ALL BOTS'}`);
    
    const { data, error } = await supabase.rpc('cleanup_and_consolidate_chat_data', {
      p_bot_id: botId || null,
    });

    if (error) {
      console.error('[chatService] Error in cleanupChatData:', error);
      return null;
    }

    console.log('[chatService] Cleanup completed:', data);
    return data;
  } catch (err) {
    console.error('[chatService] Exception in cleanupChatData:', err);
    return null;
  }
};

/**
 * Fonction de debug pour analyser les tokens de session en base
 */
export const debugSessionTokens = async (botId: string) => {
  try {
    console.log(`[chatService] === DEBUG SESSION TOKENS CALLED ===`);
    console.log(`[chatService] Bot ID: ${botId}`);
    
    // Recherche directe des messages récents pour debug
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        created_at,
        message_type,
        message_content,
        metadata,
        bot_users!inner(session_id, user_name)
      `)
      .eq('bot_id', botId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[chatService] Error in debugSessionTokens:', error);
      return null;
    }

    console.log('[chatService] === DEBUG SESSION TOKENS RESULTS ===');
    console.log(`[chatService] Total messages found: ${data?.length || 0}`);
    
    if (data && data.length > 0) {
      console.table(data.map(msg => {
        const metadata = msg.metadata;
        let metadataToken = 'N/A';
        
        // Safely extract session_token from metadata
        if (metadata && typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) {
          const metadataObj = metadata as Record<string, any>;
          metadataToken = metadataObj.session_token || metadataObj.sessionToken || 'N/A';
        }
        
        return {
          id: msg.id,
          type: msg.message_type,
          content: msg.message_content?.substring(0, 50) + '...',
          session_id: msg.bot_users?.session_id,
          metadata_token: metadataToken,
          created: msg.created_at
        };
      }));

      const foundTokens = [
        ...new Set(
          data
            .map(m => {
              const tokens = [];
              if (m.metadata && typeof m.metadata === 'object' && m.metadata !== null && !Array.isArray(m.metadata)) {
                const metadataObj = m.metadata as Record<string, any>;
                if (metadataObj.session_token) tokens.push(metadataObj.session_token);
                if (metadataObj.sessionToken) tokens.push(metadataObj.sessionToken);
              }
              if (m.bot_users?.session_id) tokens.push(m.bot_users.session_id);
              return tokens;
            })
            .flat()
            .filter(Boolean)
        ),
      ];

      console.log(`[chatService] Unique tokens found: ${foundTokens.join(', ')}`);
    } else {
      console.log('[chatService] No messages found in database for this bot');
    }

    return data;
  } catch (err) {
    console.error('[chatService] Exception in debugSessionTokens:', err);
    return null;
  }
};

/**
 * Fonction pour tester la récupération améliorée des messages
 */
export const testEnhancedMessageRetrieval = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[chatService] === TEST ENHANCED MESSAGE RETRIEVAL ===`);
    console.log(`[chatService] Testing enhanced retrieval for bot ${botId}, token ${sessionToken}`);

    // Test avec la nouvelle fonction get_chat_history améliorée
    console.log('[chatService] Test: Enhanced RPC get_chat_history');
    const { data: enhancedData, error: enhancedError } = await supabase.rpc('get_chat_history', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null,
    });

    if (enhancedError) {
      console.error('[chatService] Enhanced RPC Error:', enhancedError);
    } else {
      console.log(`[chatService] Enhanced RPC returned ${enhancedData?.length || 0} messages`);
    }

    return {
      enhanced: enhancedData,
      error: enhancedError
    };
  } catch (err) {
    console.error('[chatService] Exception in testEnhancedMessageRetrieval:', err);
    return null;
  }
};

/**
 * Alias function for backward compatibility
 */
export const testMessageRetrieval = testEnhancedMessageRetrieval;
