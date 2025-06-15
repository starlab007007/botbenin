
import { useState, useEffect, useRef, useCallback } from 'react';
import { initializeVisitorTracking, getCurrentVisitorSession } from '@/utils/visitorTracking';

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

  const safeSet = (v: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    // avoids setting state on unmounted or irrelevant
    if (!initializingRef.current) return;
    v(value);
  };

  const initializeSession = useCallback(async () => {
    if (!botId) {
      setIsReady(true);
      setIsInitializing(false);
      return;
    }
    // Prevent race conditions
    if (isInitializing || initializingRef.current) return;
    initializingRef.current = true;
    setIsInitializing(true);
    setError(null);

    try {
      // Always check for an existing session (single source of truth)
      const existingToken = getCurrentVisitorSession();
      if (existingToken) {
        setSessionToken(existingToken);
        setIsReady(true);
        setIsInitializing(false);
        initializingRef.current = false;
        return;
      }
      // Initialize new session if not present
      const newToken = await initializeVisitorTracking(botId, entryPoint);
      if (typeof newToken === "string" && newToken.startsWith('anon_')) {
        setSessionToken(newToken);
        setIsReady(true);
        setError(null);
      } else {
        setSessionToken(null);
        setIsReady(false);
        setError(
          typeof newToken === 'string'
            ? `Échec création session: ${newToken}`
            : 'Échec création du token de session'
        );
      }
    } catch (error: any) {
      let errMsg = '[useSessionManager] Session initialization failed: ';
      if (error?.message) {
        errMsg += error.message;
      } else if (typeof error === 'string') {
        errMsg += error;
      } else {
        errMsg += JSON.stringify(error);
      }
      setSessionToken(null);
      setIsReady(false);
      setError("Impossible d'initialiser la session. Détail: " + errMsg);
    } finally {
      setIsInitializing(false);
      initializingRef.current = false;
    }
  }, [botId, entryPoint, isInitializing]);

  useEffect(() => {
    if (!botId) {
      setSessionToken(null);
      setIsReady(true);
      setIsInitializing(false);
      return;
    }
    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId, entryPoint]); // Only re-initialize if botId or entryPoint changes

  const retryInitialization = useCallback(() => {
    setIsReady(false);
    setError(null);
    setSessionToken(null);
    setIsInitializing(false);
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
