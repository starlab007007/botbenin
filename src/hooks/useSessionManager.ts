
import { useState, useEffect, useCallback } from 'react';
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

  const initializeSession = useCallback(async () => {
    if (!botId) {
      console.log(`[useSessionManager] No botId provided, skipping initialization`);
      setIsReady(true);
      setIsInitializing(false);
      return;
    }

    if (isInitializing || isReady) {
      console.log(`[useSessionManager] Already initializing or ready, skipping`);
      return;
    }

    console.log(`[useSessionManager] Starting session initialization for bot ${botId}`);
    setIsInitializing(true);
    setError(null);

    try {
      // Vérifier d'abord si on a déjà un token valide
      const existingToken = getCurrentVisitorSession();
      if (existingToken) {
        console.log(`[useSessionManager] Found existing valid token: ${existingToken}`);
        setSessionToken(existingToken);
        setIsReady(true);
        setIsInitializing(false);
        return;
      }

      // Sinon, créer une nouvelle session
      console.log(`[useSessionManager] Creating new session for bot ${botId}`);
      const newToken = await initializeVisitorTracking(botId, entryPoint);
      
      if (newToken && newToken.startsWith('anon_')) {
        console.log(`[useSessionManager] Session initialized successfully: ${newToken}`);
        setSessionToken(newToken);
        setIsReady(true);
      } else {
        throw new Error('Failed to create valid session token');
      }
    } catch (error) {
      console.error('[useSessionManager] Session initialization failed:', error);
      setError('Impossible d\'initialiser la session');
      // En cas d'erreur, on considère quand même comme "prêt" pour éviter le blocage
      setIsReady(true);
    } finally {
      setIsInitializing(false);
    }
  }, [botId, entryPoint, isInitializing, isReady]);

  useEffect(() => {
    initializeSession();
  }, [botId, initializeSession]);

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
