
// Main visitor tracking module - re-exports from smaller modules
export { generateBrowserFingerprint, createOrGetVisitorFingerprint } from './fingerprinting/browserFingerprint';
export { createAnonymousVisitorSession, validateBotForSession } from './sessions/sessionManager';
export { getCurrentVisitorSession, storeVisitorSession, clearVisitorSession } from './sessions/sessionStorage';
export { trackVisitorEvent } from './tracking/eventTracker';
export { collectVisitorData } from './tracking/dataCollector';
export { extractUTMParams } from './tracking/utmExtractor';

import { generateBrowserFingerprint, createOrGetVisitorFingerprint } from './fingerprinting/browserFingerprint';
import { createAnonymousVisitorSession, validateBotForSession } from './sessions/sessionManager';
import { getCurrentVisitorSession, storeVisitorSession, clearVisitorSession } from './sessions/sessionStorage';
import { trackVisitorEvent } from './tracking/eventTracker';
import { extractUTMParams } from './tracking/utmExtractor';
import { supabase } from '@/integrations/supabase/client';

/**
 * Initialize visitor tracking - Now using corrected secure database functions
 */
export const initializeVisitorTracking = async (botId: string, entryPoint?: string): Promise<string | null> => {
  try {
    console.log(`[visitorTracking] === ABSOLUTE SECURE VISITOR TRACKING INIT ===`);
    console.log(`[visitorTracking] Using corrected secure DB functions`);
    console.log(`[visitorTracking] Bot ID: ${botId}, Entry: ${entryPoint}`);
    
    // Run global bot repair first to ensure accessibility
    try {
      const { data: repairResults, error: repairError } = await supabase.rpc('global_bot_repair');
      if (repairResults && repairResults.length > 0) {
        console.log('[visitorTracking] Global bot repair completed:', repairResults);
      }
    } catch (repairErr) {
      console.warn('[visitorTracking] Global repair failed, continuing:', repairErr);
    }
    
    // Validate bot with corrected secure auto-repair
    const botValidation = await validateBotForSession(botId);
    if (!botValidation.valid) {
      console.error('[visitorTracking] Bot validation failed with corrected functions:', botValidation.error);
      clearVisitorSession();
      return botValidation.error || 'Bot validation failed';
    }
    
    // Check for existing valid session
    const existingToken = getCurrentVisitorSession();
    if (existingToken) {
      console.log(`[visitorTracking] Using existing valid session: ${existingToken}`);
      return existingToken;
    }

    // Generate fingerprint
    const fingerprintHash = generateBrowserFingerprint();
    console.log(`[visitorTracking] Generated fingerprint: ${fingerprintHash.slice(0, 16)}...`);
    
    const fingerprintResult = await createOrGetVisitorFingerprint(fingerprintHash);

    if (typeof fingerprintResult === 'object' && fingerprintResult !== null && 'error' in fingerprintResult) {
      const errorMsg = `[visitorTracking] Fingerprint creation failed: ${fingerprintResult.error}`;
      console.error(errorMsg);
      clearVisitorSession();
      return errorMsg;
    }

    if (typeof fingerprintResult !== 'string' || !fingerprintResult) {
      const errorMsg = `[visitorTracking] Invalid fingerprint result: ${fingerprintResult}`;
      console.error(errorMsg);
      clearVisitorSession();
      return errorMsg;
    }

    // Extract UTM parameters and determine entry point
    const utmParams = extractUTMParams();
    const finalEntryPoint = entryPoint || (document.referrer ? 'referral' : 'direct');
    
    console.log(`[visitorTracking] Creating session with corrected functions, entry point: ${finalEntryPoint}`);

    // Create session using corrected secure functions
    const sessionTokenResult = await createAnonymousVisitorSession(
      fingerprintResult,
      botId,
      finalEntryPoint,
      document.referrer,
      utmParams
    );

    if (typeof sessionTokenResult === 'object' && sessionTokenResult !== null && 'error' in sessionTokenResult) {
      const errorMsg = `[visitorTracking] Session creation failed with corrected functions: ${sessionTokenResult.error}`;
      console.error(errorMsg);
      clearVisitorSession();
      return errorMsg;
    }
    
    if (typeof sessionTokenResult !== 'string' || !sessionTokenResult.startsWith('anon_')) {
      const errorMsg = `[visitorTracking] Invalid session token from corrected functions: ${sessionTokenResult}`;
      console.error(errorMsg);
      clearVisitorSession();
      return errorMsg;
    }

    const token: string = sessionTokenResult;
    storeVisitorSession(token);
    
    console.log(`[visitorTracking] Session created successfully with corrected functions: ${token}`);

    // Track session start event (non-blocking)
    try {
      await trackVisitorEvent(
        token,
        'session_start',
        {
          url: window.location.href,
          utm_params: utmParams,
          fingerprint_hash: fingerprintHash,
          bot_id: botId,
          entry_point: finalEntryPoint,
          secure_tracking: true,
          bot_validated: true,
          system_version: 'absolute_secure_v1',
          absolute_correction_applied: true
        }
      );
    } catch (trackingErr) {
      console.warn('[visitorTracking] Failed to track session start event:', trackingErr);
      // Don't fail for tracking issues
    }

    return token;

  } catch (error: any) {
    console.error('[visitorTracking] Exception in corrected initializeVisitorTracking:', error);
    clearVisitorSession();
    return 'Erreur lors de l\'initialisation du tracking sécurisé corrected: ' + (error?.message ? error.message : JSON.stringify(error));
  }
};
