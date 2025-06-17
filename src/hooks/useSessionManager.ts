
import { useState, useEffect, useRef, useCallback } from 'react';
import { initializeVisitorTracking, getCurrentVisitorSession } from '@/utils/visitorTracking';
import { supabase } from '@/integrations/supabase/client';

interface UseSessionManagerProps {
  botId?: string | null;
  entryPoint?: string;
}

export const useSessionManager = ({ botId, entryPoint = 'direct' }: UseSessionManagerProps) => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent multiple concurrent initializations
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  // Safe state setter that checks if component is mounted
  const safeSetState = useCallback((setter: Function, value: any) => {
    if (mountedRef.current) {
      setter(value);
    }
  }, []);

  const initializeSession = useCallback(async () => {
    if (!botId) {
      safeSetState(setIsReady, true);
      safeSetState(setIsInitializing, false);
      return;
    }

    // Prevent race conditions
    if (isInitializing || initializingRef.current) return;
    
    initializingRef.current = true;
    safeSetState(setIsInitializing, true);
    safeSetState(setError, null);

    try {
      // Always check for an existing session first
      const existingToken = getCurrentVisitorSession();
      if (existingToken) {
        console.log(`[useSessionManager] Using existing session token: ${existingToken}`);
        safeSetState(setSessionToken, existingToken);
        safeSetState(setIsReady, true);
        safeSetState(setIsInitializing, false);
        initializingRef.current = false;
        retryCountRef.current = 0;
        return;
      }

      // Initialize new session if not present using final corrected functions
      console.log(`[useSessionManager] Creating new final corrected secure session for bot ${botId}`);
      const newToken = await initializeVisitorTracking(botId, entryPoint);
      
      if (typeof newToken === "string" && newToken.startsWith('anon_')) {
        console.log(`[useSessionManager] Successfully created final corrected secure session: ${newToken}`);
        safeSetState(setSessionToken, newToken);
        safeSetState(setIsReady, true);
        safeSetState(setError, null);
        retryCountRef.current = 0;
      } else {
        console.error(`[useSessionManager] Invalid token received: ${newToken}`);
        
        // Enhanced error handling with final corrected secure auto-repair
        if (typeof newToken === 'string' && (newToken.includes('n\'existe pas') || newToken.includes('accessible'))) {
          // Tentative de réparation automatique sécurisée finale
          try {
            console.log('[useSessionManager] Tentative de réparation automatique sécurisée finale...');
            await supabase.rpc('global_bot_repair');
            
            // Réessayer après la réparation
            if (retryCountRef.current < 2) {
              retryCountRef.current += 1;
              initializingRef.current = false;
              setTimeout(() => initializeSession(), 1000);
              return;
            }
          } catch (autoFixError) {
            console.warn('[useSessionManager] Final corrected auto-repair failed:', autoFixError);
          }
        }
        
        safeSetState(setSessionToken, null);
        safeSetState(setIsReady, false);
        safeSetState(setError, 
          typeof newToken === 'string'
            ? `Échec création session sécurisée finale: ${newToken}`
            : 'Échec création du token de session sécurisé final'
        );
      }
    } catch (error: any) {
      console.error('[useSessionManager] Final corrected secure session initialization failed:', error);
      let errMsg = 'Final corrected secure session initialization failed: ';
      if (error?.message) {
        errMsg += error.message;
      } else if (typeof error === 'string') {
        errMsg += error;
      } else {
        errMsg += JSON.stringify(error);
      }
      
      safeSetState(setSessionToken, null);
      safeSetState(setIsReady, false);
      safeSetState(setError, "Impossible d'initialiser la session sécurisée finale. Détail: " + errMsg);
    } finally {
      safeSetState(setIsInitializing, false);
      initializingRef.current = false;
    }
  }, [botId, entryPoint, isInitializing, safeSetState]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (!botId) {
      setSessionToken(null);
      setIsReady(true);
      setIsInitializing(false);
      return;
    }
    
    initializeSession();

    return () => {
      mountedRef.current = false;
    };
  }, [botId, entryPoint]); // Only re-initialize if botId or entryPoint changes

  const retryInitialization = useCallback(() => {
    setIsReady(false);
    setError(null);
    setSessionToken(null);
    setIsInitializing(false);
    initializingRef.current = false;
    retryCountRef.current = 0;
    setTimeout(() => initializeSession(), 100);
  }, [initializeSession]);

  return {
    sessionToken,
    isInitializing,
    isReady,
    error,
    retryInitialization
  };
};
