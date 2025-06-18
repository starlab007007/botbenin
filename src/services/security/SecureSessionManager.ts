
import { SecurityManager } from './SecurityManager';
import { supabase } from '@/integrations/supabase/client';

interface SessionCreationResult {
  success: boolean;
  sessionToken?: string;
  error?: string;
}

interface SessionValidationResult {
  isValid: boolean;
  sessionData?: any;
  error?: string;
}

export class SecureSessionManager {
  private static readonly SESSION_STORAGE_KEY = 'secure_session_data';
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 heures
  private static readonly FINGERPRINT_TIMEOUT = 5000; // 5 secondes

  /**
   * Création d'une session sécurisée
   */
  static async createSecureSession(
    botId: string,
    entryPoint: string = 'direct'
  ): Promise<SessionCreationResult> {
    try {
      console.log(`[SecureSessionManager] Creating secure session for bot ${botId}`);

      // Validation de l'ID du bot
      const botValidation = SecurityManager.validateAndSanitizeInput(botId, 'uuid');
      if (!botValidation.isValid) {
        return { success: false, error: 'ID de bot invalide' };
      }

      // Génération d'un token de session sécurisé
      const sessionToken = `anon_${SecurityManager.generateSecureToken(32)}`;
      const fingerprint = await this.generateSecureFingerprint();

      // Préparation des métadonnées de session
      const sessionMetadata = {
        entry_point: entryPoint,
        user_agent: navigator.userAgent?.substring(0, 500) || 'unknown',
        fingerprint_hash: fingerprint,
        created_at: new Date().toISOString(),
        security_level: 'high'
      };

      // Sauvegarde directe avec une approche simplifiée
      const { data, error } = await supabase
        .from('anonymous_visitor_sessions')
        .insert({
          session_token: sessionToken,
          bot_id: botValidation.sanitized,
          visitor_fingerprint: fingerprint,
          metadata: SecurityManager.sanitizeLogData(sessionMetadata),
          expires_at: new Date(Date.now() + this.SESSION_DURATION).toISOString()
        })
        .select('session_token')
        .single();

      if (error) {
        console.error('[SecureSessionManager] Session creation failed:', error);
        return { success: false, error: 'Échec de création de session' };
      }

      // Stockage local sécurisé
      this.storeSessionLocally(sessionToken, fingerprint);

      console.log(`[SecureSessionManager] Secure session created successfully: ${sessionToken.substring(0, 10)}...`);
      return { success: true, sessionToken };

    } catch (error: any) {
      console.error('[SecureSessionManager] Session creation error:', error);
      return { success: false, error: 'Erreur interne de création de session' };
    }
  }

  /**
   * Validation d'une session existante
   */
  static async validateSession(sessionToken: string): Promise<boolean> {
    try {
      const sessionValidation = SecurityManager.validateAndSanitizeInput(sessionToken, 'string');
      if (!sessionValidation.isValid || !sessionToken.startsWith('anon_')) {
        return false;
      }

      // Vérification directe avec une approche simplifiée
      const { data, error } = await supabase
        .from('anonymous_visitor_sessions')
        .select('session_token, expires_at')
        .eq('session_token', sessionValidation.sanitized)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mise à jour de l'activité de session
   */
  static updateSessionActivity(): void {
    const stored = this.getStoredSession();
    if (stored) {
      stored.lastActivity = Date.now();
      this.storeSessionLocally(stored.token, stored.fingerprint);
    }
  }

  /**
   * Récupération de la session stockée localement
   */
  static getStoredSession(): { token: string; fingerprint: string; lastActivity: number } | null {
    try {
      const stored = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);
      
      // Vérifier l'expiration locale
      if (Date.now() - data.lastActivity > this.SESSION_DURATION) {
        this.clearStoredSession();
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Stockage local sécurisé de la session
   */
  private static storeSessionLocally(token: string, fingerprint: string): void {
    try {
      const sessionData = {
        token,
        fingerprint,
        lastActivity: Date.now()
      };
      
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.warn('[SecureSessionManager] Failed to store session locally:', error);
    }
  }

  /**
   * Nettoyage de la session stockée
   */
  static clearStoredSession(): void {
    try {
      localStorage.removeItem(this.SESSION_STORAGE_KEY);
    } catch (error) {
      console.warn('[SecureSessionManager] Failed to clear stored session:', error);
    }
  }

  /**
   * Génération d'une empreinte sécurisée du navigateur
   */
  private static async generateSecureFingerprint(): Promise<string> {
    try {
      // Collecte de données de base
      const fpData = {
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        timestamp: Date.now()
      };

      // Génération d'une empreinte simple
      const fpString = JSON.stringify(fpData);
      const encoder = new TextEncoder();
      const data = encoder.encode(fpString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return hashHex.substring(0, 32);
    } catch (error) {
      console.warn('[SecureSessionManager] Fingerprint generation failed:', error);
      return SecurityManager.generateSecureToken(32);
    }
  }

  /**
   * Nettoyage des sessions expirées
   */
  static cleanupExpiredSessions(): void {
    const stored = this.getStoredSession();
    if (stored && Date.now() - stored.lastActivity > this.SESSION_DURATION) {
      this.clearStoredSession();
    }
  }
}
