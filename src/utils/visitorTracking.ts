
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

/**
 * Initialize visitor tracking - Now using corrected database functions
 */
export const initializeVisitorTracking = async (botId: string, entryPoint?: string): Promise<string | null> => {
  try {
    console.log(`[visitorTracking] === CORRECTED VISITOR TRACKING INIT ===`);
    console.log(`[visitorTracking] Using corrected DB functions without session_token ambiguity`);
    console.log(`[visitorTracking] Bot ID: ${botId}, Entry: ${entryPoint}`);
    
    // Validate bot with corrected auto-repair
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

    // Create session using corrected functions
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
          corrected_tracking: true,
          bot_validated: true,
          system_version: 'corrected_v1'
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
    return 'Erreur lors de l\'initialisation du tracking corrigé: ' + (error?.message ? error.message : JSON.stringify(error));
  }
};
