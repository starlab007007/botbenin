
import { useState, useEffect, useRef, useCallback } from 'react';
import { SecureSessionManager } from '@/services/security/SecureSessionManager';
import { SecurityManager } from '@/services/security/SecurityManager';

interface UseSecureSessionManagerProps {
  botId?: string | null;
  entryPoint?: string;
}

export const useSecureSessionManager = ({ 
  botId, 
  entryPoint = 'direct' 
}: UseSecureSessionManagerProps) => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityStatus, setSecurityStatus] = useState<'secure' | 'warning' | 'error'>('secure');

  const initializingRef = useRef(false);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const safeSetState = useCallback((setter: Function, value: any) => {
    if (mountedRef.current) {
      setter(value);
    }
  }, []);

  const initializeSecureSession = useCallback(async () => {
    if (!botId) {
      safeSetState(setIsReady, true);
      safeSetState(setIsInitializing, false);
      return;
    }

    // Validation de l'ID du bot
    const botValidation = SecurityManager.validateAndSanitizeInput(botId, 'uuid');
    if (!botValidation.isValid) {
      safeSetState(setError, 'ID de bot invalide');
      safeSetState(setSecurityStatus, 'error');
      return;
    }

    if (isInitializing || initializingRef.current) return;
    
    initializingRef.current = true;
    safeSetState(setIsInitializing, true);
    safeSetState(setError, null);
    safeSetState(setSecurityStatus, 'secure');

    try {
      // Vérifier une session existante
      const existingSession = SecureSessionManager.getStoredSession();
      if (existingSession && await SecureSessionManager.validateSession(existingSession.token)) {
        console.log(`[useSecureSessionManager] Using existing secure session`);
        safeSetState(setSessionToken, existingSession.token);
        safeSetState(setIsReady, true);
        safeSetState(setIsInitializing, false);
        initializingRef.current = false;
        retryCountRef.current = 0;
        return;
      }

      // Créer une nouvelle session sécurisée
      console.log(`[useSecureSessionManager] Creating new secure session for bot ${botId}`);
      const result = await SecureSessionManager.createSecureSession(
        botValidation.sanitized!,
        entryPoint
      );
      
      if (result.success && result.sessionToken) {
        console.log(`[useSecureSessionManager] Secure session created successfully`);
        safeSetState(setSessionToken, result.sessionToken);
        safeSetState(setIsReady, true);
        safeSetState(setError, null);
        safeSetState(setSecurityStatus, 'secure');
        retryCountRef.current = 0;
      } else {
        console.error(`[useSecureSessionManager] Session creation failed:`, result.error);
        
        if (retryCountRef.current < 2) {
          retryCountRef.current += 1;
          safeSetState(setSecurityStatus, 'warning');
          initializingRef.current = false;
          setTimeout(() => initializeSecureSession(), 2000);
          return;
        }
        
        safeSetState(setSessionToken, null);
        safeSetState(setIsReady, false);
        safeSetState(setError, result.error || 'Échec de création de session sécurisée');
        safeSetState(setSecurityStatus, 'error');
      }
    } catch (error: any) {
      console.error('[useSecureSessionManager] Session initialization error:', error);
      
      await SecurityManager.auditSuspiciousActivity({
        action: 'session_initialization_error',
        additionalData: { error: error.message, botId }
      });
      
      safeSetState(setSessionToken, null);
      safeSetState(setIsReady, false);
      safeSetState(setError, 'Erreur de sécurité lors de l\'initialisation');
      safeSetState(setSecurityStatus, 'error');
    } finally {
      safeSetState(setIsInitializing, false);
      initializingRef.current = false;
    }
  }, [botId, entryPoint, isInitializing, safeSetState]);

  const retryInitialization = useCallback(() => {
    setIsReady(false);
    setError(null);
    setSessionToken(null);
    setIsInitializing(false);
    setSecurityStatus('secure');
    initializingRef.current = false;
    retryCountRef.current = 0;
    setTimeout(() => initializeSecureSession(), 100);
  }, [initializeSecureSession]);

  const updateActivity = useCallback(() => {
    if (sessionToken) {
      SecureSessionManager.updateSessionActivity();
    }
  }, [sessionToken]);

  const clearSession = useCallback(() => {
    SecureSessionManager.clearStoredSession();
    setSessionToken(null);
    setIsReady(false);
    setError(null);
    setSecurityStatus('secure');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    if (!botId) {
      setSessionToken(null);
      setIsReady(true);
      setIsInitializing(false);
      return;
    }
    
    initializeSecureSession();

    // Nettoyage périodique des sessions expirées
    cleanupIntervalRef.current = setInterval(() => {
      SecureSessionManager.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      mountedRef.current = false;
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [botId, entryPoint]);

  // Mise à jour d'activité périodique
  useEffect(() => {
    if (sessionToken && isReady) {
      const activityInterval = setInterval(updateActivity, 30000); // 30 secondes
      return () => clearInterval(activityInterval);
    }
  }, [sessionToken, isReady, updateActivity]);

  return {
    sessionToken,
    isInitializing,
    isReady,
    error,
    securityStatus,
    retryInitialization,
    updateActivity,
    clearSession
  };
};
