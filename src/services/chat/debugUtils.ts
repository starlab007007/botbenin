
import { supabase } from '@/integrations/supabase/client';

/**
 * Fonction de debug pour analyser les tokens de session en base
 */
export const debugSessionTokens = async (botId: string) => {
  try {
    console.log(`[debugUtils] === DEBUG SESSION TOKENS CALLED ===`);
    console.log(`[debugUtils] Bot ID: ${botId}`);
    
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
      console.error('[debugUtils] Error in debugSessionTokens:', error);
      return null;
    }

    console.log('[debugUtils] === DEBUG SESSION TOKENS RESULTS ===');
    console.log(`[debugUtils] Total messages found: ${data?.length || 0}`);
    
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

      console.log(`[debugUtils] Unique tokens found: ${foundTokens.join(', ')}`);
    } else {
      console.log('[debugUtils] No messages found in database for this bot');
    }

    return data;
  } catch (err) {
    console.error('[debugUtils] Exception in debugSessionTokens:', err);
    return null;
  }
};

/**
 * Fonction pour tester la récupération améliorée des messages
 */
export const testEnhancedMessageRetrieval = async (botId: string, sessionToken: string) => {
  try {
    console.log(`[debugUtils] === TEST ENHANCED MESSAGE RETRIEVAL ===`);
    console.log(`[debugUtils] Testing enhanced retrieval for bot ${botId}, token ${sessionToken}`);

    // Test avec la nouvelle fonction get_chat_history améliorée
    console.log('[debugUtils] Test: Enhanced RPC get_chat_history');
    const { data: enhancedData, error: enhancedError } = await supabase.rpc('get_chat_history', {
      p_bot_id: botId,
      p_session_token: sessionToken,
      p_bot_user_id: null,
    });

    if (enhancedError) {
      console.error('[debugUtils] Enhanced RPC Error:', enhancedError);
    } else {
      console.log(`[debugUtils] Enhanced RPC returned ${enhancedData?.length || 0} messages`);
    }

    return {
      enhanced: enhancedData,
      error: enhancedError
    };
  } catch (err) {
    console.error('[debugUtils] Exception in testEnhancedMessageRetrieval:', err);
    return null;
  }
};

/**
 * Alias function for backward compatibility
 */
export const testMessageRetrieval = testEnhancedMessageRetrieval;
