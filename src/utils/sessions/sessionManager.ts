
import { supabase } from '@/integrations/supabase/client';
import { extractUTMParams } from '../tracking/utmExtractor';

/**
 * Create anonymous visitor session with enhanced validation
 */
export const createAnonymousVisitorSession = async (
  fingerprintId: string,
  botId: string,
  entryPoint: string = 'direct',
  referrerUrl?: string,
  utmParams?: { source?: string; medium?: string; campaign?: string }
): Promise<string | { error: string }> => {
  try {
    console.log(`[sessionManager] === ENHANCED SESSION CREATION ===`);
    console.log(`[sessionManager] Fingerprint: ${fingerprintId}, Bot: ${botId}, Entry: ${entryPoint}`);
    
    // Validate bot exists and is active
    const { data: botExists, error: botCheckError } = await supabase
      .from('bots')
      .select('id, is_active')
      .eq('id', botId)
      .single();
    
    if (botCheckError || !botExists) {
      console.error('[sessionManager] Bot not found:', botId);
      return { error: `Bot ${botId} n'existe pas ou n'est plus disponible` };
    }

    if (botExists.is_active === false) {
      console.error('[sessionManager] Bot inactive:', botId);
      // Auto-repair attempt
      try {
        await supabase.rpc('repair_all_session_inconsistencies');
        console.log('[sessionManager] Auto-repair completed');
      } catch (repairError) {
        console.warn('[sessionManager] Auto-repair failed:', repairError);
      }
      return { error: `Bot ${botId} est actuellement inactif` };
    }
    
    const { data, error } = await supabase.rpc('create_anonymous_visitor_session', {
      p_fingerprint_id: fingerprintId,
      p_bot_id: botId,
      p_entry_point: entryPoint,
      p_referrer_url: referrerUrl || document.referrer,
      p_utm_source: utmParams?.source,
      p_utm_medium: utmParams?.medium,
      p_utm_campaign: utmParams?.campaign,
      p_ip_address: null
    });
    
    if (error) {
      console.error('[sessionManager] RPC Error in createAnonymousVisitorSession:', error);
      
      // Handle bot-specific errors with repair
      if (error.message?.includes('does not exist') || error.message?.includes('inactive')) {
        try {
          await supabase.rpc('repair_all_session_inconsistencies');
          console.log('[sessionManager] Auto-repair completed after error');
        } catch (repairError) {
          console.warn('[sessionManager] Auto-repair failed:', repairError);
        }
        return { error: `Le bot sélectionné n'est plus disponible: ${error.message}` };
      }
      
      return { error: error.message || error.details || "Session creation failed" };
    }
    
    if (!data || typeof data !== 'string') {
      console.error('[sessionManager] Invalid session token returned:', data);
      return { error: "Invalid session token returned from server" };
    }
    
    console.log(`[sessionManager] Session created with token: ${data}`);
    return data;
    
  } catch (error: any) {
    console.error('[sessionManager] Exception in createAnonymousVisitorSession:', error);
    return { error: error?.message || JSON.stringify(error) };
  }
};

/**
 * Validate bot before session creation
 */
export const validateBotForSession = async (botId: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    const { data: botExists, error: botValidationError } = await supabase
      .from('bots')
      .select('id, name, is_active')
      .eq('id', botId)
      .single();
    
    if (botValidationError || !botExists) {
      const errorMsg = `Bot ${botId} n'existe pas`;
      console.error('[sessionManager] Bot validation failed:', errorMsg);
      
      // Auto-repair attempt
      try {
        console.log('[sessionManager] Attempting auto-repair...');
        await supabase.rpc('repair_all_session_inconsistencies');
        
        // Retry after repair
        const { data: retryBot, error: retryError } = await supabase
          .from('bots')
          .select('id, name, is_active')
          .eq('id', botId)
          .single();
          
        if (!retryError && retryBot && retryBot.is_active) {
          console.log('[sessionManager] Bot recovered after repair');
          return { valid: true };
        } else {
          return { valid: false, error: errorMsg };
        }
      } catch (diagError) {
        console.warn('[sessionManager] Auto-repair failed:', diagError);
        return { valid: false, error: errorMsg };
      }
    }
    
    if (botExists && !botExists.is_active) {
      console.log('[sessionManager] Bot inactive, attempting repair...');
      try {
        await supabase.rpc('repair_all_session_inconsistencies');
        console.log('[sessionManager] Repair completed');
        return { valid: true };
      } catch (repairError) {
        console.warn('[sessionManager] Repair failed:', repairError);
        return { valid: false, error: `Bot ${botId} est inactif et ne peut être réparé` };
      }
    }
    
    console.log(`[sessionManager] Bot validated: ${botExists?.name || 'Unknown'}`);
    return { valid: true };
    
  } catch (error: any) {
    console.error('[sessionManager] Exception validating bot:', error);
    return { valid: false, error: error?.message || 'Bot validation failed' };
  }
};
