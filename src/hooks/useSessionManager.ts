
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
      
      if (typeof newToken === "string" && newToken.startsWith('anon_')) {
        console.log(`[useSessionManager] Session initialized successfully: ${newToken}`);
        setSessionToken(newToken);
        setIsReady(true);
      } else {
        // Ici on affiche une erreur détaillée
        let errMsg = typeof newToken === 'string'
          ? `Échec création session: ${newToken}`
          : 'Échec création du token de session';
        setError(errMsg);
        setIsReady(false);
        setSessionToken(null);
        return;
      }
    } catch (error: any) {
      // Nouvelle gestion : récupération du message Supabase si présent
      let errMsg = '[useSessionManager] Session initialization failed: ';
      if (error?.message) {
        errMsg += error.message;
      } else if (typeof error === 'string') {
        errMsg += error;
      } else {
        errMsg += JSON.stringify(error);
      }
      console.error(errMsg);
      setError("Impossible d'initialiser la session. Détail: " + errMsg);
      setIsReady(false);
      setSessionToken(null);
      return;
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
