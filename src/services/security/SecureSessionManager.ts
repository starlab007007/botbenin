
import { SecurityManager } from './SecurityManager';
import { supabase } from '@/integrations/supabase/client';

interface SecureSessionResult {
  success: boolean;
  sessionToken?: string;
  error?: string;
}

export class SecureSessionManager {
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_SESSIONS_PER_USER = 10;

  /**
   * Création sécurisée d'une session
   */
  static async createSecureSession(
    botId: string,
    entryPoint: string = 'direct',
    additionalData?: any
  ): Promise<SecureSessionResult> {
    try {
      // Validation des entrées
      const botValidation = SecurityManager.validateAndSanitizeInput(botId, 'uuid');
      if (!botValidation.isValid) {
        return { success: false, error: 'Invalid bot ID' };
      }

      const entryValidation = SecurityManager.validateAndSanitizeInput(entryPoint, 'string');
      if (!entryValidation.isValid) {
        return { success: false, error: 'Invalid entry point' };
      }

      // Limitation du taux
      if (!SecurityManager.checkRateLimit(`session_creation`, {
        windowMs: 60000, // 1 minute
        maxRequests: 10
      })) {
        await SecurityManager.auditSuspiciousActivity({
          action: 'rate_limit_exceeded',
          additionalData: { botId, entryPoint }
        });
        return { success: false, error: 'Rate limit exceeded' };
      }

      // Génération d'un token sécurisé
      const sessionToken = `anon_${SecurityManager.generateSecureToken(32)}`;
      
      // Création du fingerprint sécurisé
      const fingerprint = await this.createSecureFingerprint();
      
      // Appel de la fonction Supabase sécurisée
      const { data, error } = await supabase.rpc('create_secure_visitor_session', {
        p_bot_id: botValidation.sanitized,
        p_session_token: sessionToken,
        p_fingerprint_id: fingerprint.id,
        p_entry_point: entryValidation.sanitized,
        p_metadata: SecurityManager.sanitizeLogData(additionalData || {})
      });

      if (error) {
        await SecurityManager.auditSuspiciousActivity({
          action: 'session_creation_failed',
          additionalData: { error: error.message, botId }
        });
        return { success: false, error: 'Failed to create session' };
      }

      // Stockage sécurisé côté client
      this.storeSessionSecurely(sessionToken);

      return { success: true, sessionToken };
    } catch (error: any) {
      await SecurityManager.auditSuspiciousActivity({
        action: 'session_creation_error',
        additionalData: { error: error.message }
      });
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Validation d'une session existante
   */
  static async validateSession(sessionToken: string): Promise<boolean> {
    try {
      const validation = SecurityManager.validateAndSanitizeInput(sessionToken, 'string');
      if (!validation.isValid || !sessionToken.startsWith('anon_')) {
        return false;
      }

      // Vérification de l'expiration côté client
      const stored = this.getStoredSession();
      if (!stored || Date.now() - stored.created > this.SESSION_TIMEOUT) {
        this.clearStoredSession();
        return false;
      }

      // Vérification côté serveur
      const { data, error } = await supabase.rpc('validate_secure_session', {
        p_session_token: validation.sanitized
      });

      if (error || !data) {
        this.clearStoredSession();
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Stockage sécurisé côté client
   */
  private static storeSessionSecurely(sessionToken: string): void {
    try {
      const sessionData = {
        token: SecurityManager.encryptSensitiveData(sessionToken),
        created: Date.now(),
        lastActivity: Date.now()
      };
      
      sessionStorage.setItem('secure_visitor_session', JSON.stringify(sessionData));
    } catch (error) {
      console.error('[SecureSessionManager] Failed to store session:', error);
    }
  }

  /**
   * Récupération sécurisée de la session
   */
  static getStoredSession(): { token: string; created: number; lastActivity: number } | null {
    try {
      const stored = sessionStorage.getItem('secure_visitor_session');
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      const decryptedToken = SecurityManager.decryptSensitiveData(parsed.token);
      
      if (!decryptedToken || !decryptedToken.startsWith('anon_')) {
        this.clearStoredSession();
        return null;
      }

      return {
        token: decryptedToken,
        created: parsed.created,
        lastActivity: parsed.lastActivity
      };
    } catch {
      this.clearStoredSession();
      return null;
    }
  }

  /**
   * Nettoyage sécurisé de la session
   */
  static clearStoredSession(): void {
    try {
      sessionStorage.removeItem('secure_visitor_session');
      sessionStorage.removeItem('visitor_session_token'); // Ancienne version
    } catch (error) {
      console.error('[SecureSessionManager] Failed to clear session:', error);
    }
  }

  /**
   * Création d'un fingerprint sécurisé
   */
  private static async createSecureFingerprint(): Promise<{ id: string }> {
    try {
      // Collecte sécurisée des informations du navigateur
      const browserInfo = {
        userAgent: navigator.userAgent ? navigator.userAgent.substring(0, 500) : 'unknown',
        language: navigator.language || 'unknown',
        platform: navigator.platform || 'unknown',
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: Date.now()
      };

      // Génération d'un hash sécurisé
      const fingerprintString = JSON.stringify(browserInfo);
      const encoder = new TextEncoder();
      const data = encoder.encode(fingerprintString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fingerprintHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Création du fingerprint via Supabase
      const { data: fingerprint, error } = await supabase.rpc('create_secure_fingerprint', {
        p_fingerprint_hash: fingerprintHash,
        p_browser_info: SecurityManager.sanitizeLogData(browserInfo)
      });

      if (error || !fingerprint) {
        throw new Error('Failed to create fingerprint');
      }

      return { id: fingerprint };
    } catch (error) {
      console.error('[SecureSessionManager] Fingerprint creation failed:', error);
      // Fallback avec un ID généré
      return { id: SecurityManager.generateSecureToken(16) };
    }
  }

  /**
   * Mise à jour de l'activité de session
   */
  static updateSessionActivity(): void {
    try {
      const stored = this.getStoredSession();
      if (stored) {
        stored.lastActivity = Date.now();
        this.storeSessionSecurely(stored.token);
      }
    } catch (error) {
      console.error('[SecureSessionManager] Failed to update activity:', error);
    }
  }

  /**
   * Nettoyage des sessions expirées
   */
  static cleanupExpiredSessions(): void {
    try {
      const stored = this.getStoredSession();
      if (stored && Date.now() - stored.lastActivity > this.SESSION_TIMEOUT) {
        this.clearStoredSession();
      }
    } catch (error) {
      console.error('[SecureSessionManager] Failed to cleanup sessions:', error);
    }
  }
}
