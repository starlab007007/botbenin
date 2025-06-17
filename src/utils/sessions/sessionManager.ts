
import { supabase } from '@/integrations/supabase/client';
import { extractUTMParams } from '../tracking/utmExtractor';

/**
 * Create anonymous visitor session with corrected secure database functions
 */
export const createAnonymousVisitorSession = async (
  fingerprintId: string,
  botId: string,
  entryPoint: string = 'direct',
  referrerUrl?: string,
  utmParams?: { source?: string; medium?: string; campaign?: string }
): Promise<string | { error: string }> => {
  try {
    console.log(`[sessionManager] === ABSOLUTE SECURE SESSION CREATION ===`);
    console.log(`[sessionManager] Using corrected secure DB functions`);
    console.log(`[sessionManager] Fingerprint: ${fingerprintId}, Bot: ${botId}, Entry: ${entryPoint}`);
    
    // Test the corrected secure functions first
    try {
      const { data: testResult, error: testError } = await supabase.rpc('global_bot_repair');
      if (testResult && testResult.length > 0) {
        console.log('[sessionManager] Global repair results:', testResult);
      }
    } catch (testErr) {
      console.warn('[sessionManager] Global repair test failed:', testErr);
    }

    // Validate bot exists and is active using the corrected secure function
    try {
      const { data: accessible, error: accessError } = await supabase.rpc('ensure_bot_accessibility', {
        p_bot_id: botId
      });
      
      if (accessError || !accessible) {
        console.error('[sessionManager] Bot not accessible:', { botId, error: accessError, accessible });
        return { error: `Bot ${botId} n'est pas accessible ou n'existe plus` };
      }
    } catch (accessErr) {
      console.error('[sessionManager] Bot accessibility check failed:', accessErr);
      return { error: `Impossible de vérifier l'accessibilité du bot ${botId}` };
    }
    
    // Use the corrected secure create_anonymous_visitor_session function with explicit table qualification
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
      console.error('[sessionManager] RPC Error in corrected createAnonymousVisitorSession:', error);
      
      // Handle specific errors with auto-repair
      if (error.message?.includes('does not exist') || error.message?.includes('inactive')) {
        try {
          await supabase.rpc('global_bot_repair');
          console.log('[sessionManager] Global repair completed after error');
        } catch (repairError) {
          console.warn('[sessionManager] Global repair failed:', repairError);
        }
        return { error: `Le bot sélectionné n'est plus disponible: ${error.message}` };
      }
      
      return { error: error.message || error.details || "Session creation failed" };
    }
    
    if (!data || typeof data !== 'string') {
      console.error('[sessionManager] Invalid session token returned:', data);
      return { error: "Invalid session token returned from server" };
    }
    
    console.log(`[sessionManager] Session created successfully with corrected functions: ${data}`);
    return data;
    
  } catch (error: any) {
    console.error('[sessionManager] Exception in corrected createAnonymousVisitorSession:', error);
    return { error: error?.message || JSON.stringify(error) };
  }
};

/**
 * Validate bot before session creation using corrected secure functions
 */
export const validateBotForSession = async (botId: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    // Use the corrected ensure_bot_accessibility function
    const { data: accessible, error: accessibilityError } = await supabase.rpc('ensure_bot_accessibility', {
      p_bot_id: botId
    });
    
    if (accessibilityError) {
      const errorMsg = `Bot accessibility check failed: ${accessibilityError.message}`;
      console.error('[sessionManager] Bot validation failed:', errorMsg);
      
      // Auto-repair attempt using corrected secure functions
      try {
        console.log('[sessionManager] Attempting global repair with corrected functions...');
        await supabase.rpc('global_bot_repair');
        
        // Retry after repair
        const { data: retryAccessible, error: retryError } = await supabase.rpc('ensure_bot_accessibility', {
          p_bot_id: botId
        });
          
        if (!retryError && retryAccessible) {
          console.log('[sessionManager] Bot recovered after repair with corrected functions');
          return { valid: true };
        } else {
          return { valid: false, error: errorMsg };
        }
      } catch (repairError) {
        console.warn('[sessionManager] Global repair failed with corrected functions:', repairError);
        return { valid: false, error: errorMsg };
      }
    }
    
    if (!accessible) {
      console.log('[sessionManager] Bot not accessible, attempting repair with corrected functions...');
      try {
        await supabase.rpc('global_bot_repair');
        console.log('[sessionManager] Global repair completed with corrected functions');
        return { valid: true };
      } catch (repairError) {
        console.warn('[sessionManager] Repair failed with corrected functions:', repairError);
        return { valid: false, error: `Bot ${botId} n'est pas accessible et ne peut être réparé` };
      }
    }
    
    console.log(`[sessionManager] Bot validated with corrected functions: ${botId}`);
    return { valid: true };
    
  } catch (error: any) {
    console.error('[sessionManager] Exception validating bot with corrected functions:', error);
    return { valid: false, error: error?.message || 'Bot validation failed' };
  }
};
