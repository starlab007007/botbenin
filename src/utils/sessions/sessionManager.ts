
import { supabase } from '@/integrations/supabase/client';
import { extractUTMParams } from '../tracking/utmExtractor';

/**
 * Create anonymous visitor session using the corrected final system
 */
export const createAnonymousVisitorSession = async (
  fingerprintId: string,
  botId: string,
  entryPoint: string = 'direct',
  referrerUrl?: string,
  utmParams?: { source?: string; medium?: string; campaign?: string }
): Promise<string | { error: string }> => {
  try {
    console.log(`[sessionManager] === CORRECTED FINAL SYSTEM SESSION CREATION ===`);
    console.log(`[sessionManager] Using corrected final functions`);
    console.log(`[sessionManager] Fingerprint: ${fingerprintId}, Bot: ${botId}, Entry: ${entryPoint}`);
    
    // Validate bot exists using the corrected final system
    try {
      const { data: botExists, error: botError } = await supabase.rpc('verify_bot_access_final', {
        p_bot_id: botId
      });
      
      if (botError || !botExists) {
        console.error('[sessionManager] Bot validation failed:', { botId, error: botError, exists: botExists });
        return { error: `Bot ${botId} n'est pas accessible ou n'existe plus` };
      }
    } catch (botErr) {
      console.error('[sessionManager] Bot validation check failed:', botErr);
      return { error: `Impossible de vérifier l'accessibilité du bot ${botId}` };
    }
    
    // Use the corrected create_visitor_session_final function
    const { data, error } = await supabase.rpc('create_visitor_session_final', {
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
      console.error('[sessionManager] Corrected final system RPC Error:', error);
      return { error: error.message || error.details || "Session creation failed" };
    }
    
    if (!data || typeof data !== 'string') {
      console.error('[sessionManager] Invalid session token returned:', data);
      return { error: "Invalid session token returned from server" };
    }
    
    console.log(`[sessionManager] Session created successfully with corrected final system: ${data}`);
    return data;
    
  } catch (error: any) {
    console.error('[sessionManager] Exception in corrected final system createAnonymousVisitorSession:', error);
    return { error: error?.message || JSON.stringify(error) };
  }
};

/**
 * Validate bot before session creation using corrected final functions
 */
export const validateBotForSession = async (botId: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    // Use the corrected verify_bot_access_final function
    const { data: accessible, error: accessibilityError } = await supabase.rpc('verify_bot_access_final', {
      p_bot_id: botId
    });
    
    if (accessibilityError) {
      const errorMsg = `Bot accessibility check failed: ${accessibilityError.message}`;
      console.error('[sessionManager] Bot validation failed:', errorMsg);
      
      // Auto-repair attempt using corrected final functions
      try {
        console.log('[sessionManager] Attempting system repair with corrected final functions...');
        await supabase.rpc('repair_system_final');
        
        // Retry after repair
        const { data: retryAccessible, error: retryError } = await supabase.rpc('verify_bot_access_final', {
          p_bot_id: botId
        });
          
        if (!retryError && retryAccessible) {
          console.log('[sessionManager] Bot recovered after repair with corrected final system');
          return { valid: true };
        } else {
          return { valid: false, error: errorMsg };
        }
      } catch (repairError) {
        console.warn('[sessionManager] System repair failed with corrected final functions:', repairError);
        return { valid: false, error: errorMsg };
      }
    }
    
    if (!accessible) {
      console.log('[sessionManager] Bot not accessible, attempting repair with corrected final system...');
      try {
        await supabase.rpc('repair_system_final');
        console.log('[sessionManager] System repair completed with corrected final functions');
        return { valid: true };
      } catch (repairError) {
        console.warn('[sessionManager] Repair failed with corrected final system:', repairError);
        return { valid: false, error: `Bot ${botId} n'est pas accessible et ne peut être réparé` };
      }
    }
    
    console.log(`[sessionManager] Bot validated with corrected final system: ${botId}`);
    return { valid: true };
    
  } catch (error: any) {
    console.error('[sessionManager] Exception validating bot with corrected final system:', error);
    return { valid: false, error: error?.message || 'Bot validation failed' };
  }
};
