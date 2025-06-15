
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
    console.log(`[chatService] === SAVING MESSAGE ===`);
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
      debug_info: {
        bot_id: botId,
        session_token: sessionToken,
        saved_timestamp: Date.now()
      }
    };

    console.log(`[chatService] Enriched metadata:`, enrichedMetadata);

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

    console.log('[chatService] *** MESSAGE SAVED SUCCESSFULLY ***');
    console.log('[chatService] Message ID:', data);
    console.log('[chatService] Session token used:', sessionToken);
    
    // Vérification immédiate : chercher le message qu'on vient de sauvegarder
    setTimeout(async () => {
      console.log('[chatService] === VERIFICATION POST-SAUVEGARDE ===');
      const { data: verification, error: verifyError } = await supabase
        .from('chat_messages')
        .select('id, metadata, bot_users!inner(session_id)')
        .eq('bot_id', botId)
        .eq('id', data)
        .single();
      
      if (verification) {
        console.log('[chatService] Message trouvé après sauvegarde:', verification);
      } else {
        console.error('[chatService] Message INTROUVABLE après sauvegarde:', verifyError);
      }
    }, 1000);

    return data;
  } catch (err) {
    console.error('[chatService] *** EXCEPTION IN saveChatMessage ***');
    console.error('[chatService] Exception:', err);
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
 * Nouvelle fonction pour tester la récupération des messages par token
 */
export const testMessageRetrieval = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[chatService] === TEST MESSAGE RETRIEVAL ===`);
    console.log(`[chatService] Testing retrieval for bot ${botId}, token ${sessionToken}`);

    // Test 1: Appel RPC get_chat_history
    console.log('[chatService] Test 1: RPC get_chat_history');
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_chat_history', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null,
    });

    if (rpcError) {
      console.error('[chatService] RPC Error:', rpcError);
    } else {
      console.log(`[chatService] RPC returned ${rpcData?.length || 0} messages`);
    }

    // Test 2: Recherche directe par metadata
    console.log('[chatService] Test 2: Direct metadata search');
    const { data: directData, error: directError } = await supabase
      .from('chat_messages')
      .select(`
        id,
        message_content,
        message_type,
        created_at,
        metadata,
        bot_users!inner(session_id)
      `)
      .eq('bot_id', botId)
      .or(`metadata->>session_token.eq.${sessionToken},bot_users.session_id.eq.${sessionToken}`)
      .order('created_at', { ascending: true });

    if (directError) {
      console.error('[chatService] Direct search error:', directError);
    } else {
      console.log(`[chatService] Direct search returned ${directData?.length || 0} messages`);
    }

    // Test 3: Recherche avec LIKE pour partial match
    console.log('[chatService] Test 3: Partial token search');
    const { data: partialData, error: partialError } = await supabase
      .from('chat_messages')
      .select(`
        id,
        message_content,
        message_type,
        created_at,
        metadata,
        bot_users!inner(session_id)
      `)
      .eq('bot_id', botId)
      .or(`metadata::text.ilike.%${sessionToken}%,bot_users.session_id.ilike.%${sessionToken}%`)
      .order('created_at', { ascending: true });

    if (partialError) {
      console.error('[chatService] Partial search error:', partialError);
    } else {
      console.log(`[chatService] Partial search returned ${partialData?.length || 0} messages`);
    }

    return {
      rpc: rpcData,
      direct: directData,
      partial: partialData
    };
  } catch (err) {
    console.error('[chatService] Exception in testMessageRetrieval:', err);
    return null;
  }
};
