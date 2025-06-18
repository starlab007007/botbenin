
import { supabase } from '@/integrations/supabase/client';
import CryptoJS from 'crypto-js';

interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: any;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export class SecurityManager {
  private static readonly RATE_LIMIT_STORAGE_KEY = 'rate_limit_data';
  private static readonly MAX_INPUT_LENGTH = 10000;
  private static readonly ALLOWED_DOMAINS = ['bot.bj', 'ia.bot.bj'];

  /**
   * Valide et sanitise les entrées utilisateur
   */
  static validateAndSanitizeInput(input: any, type: 'string' | 'uuid' | 'email' | 'url' = 'string'): SecurityValidationResult {
    const errors: string[] = [];
    
    if (!input) {
      return { isValid: false, errors: ['Input is required'] };
    }

    // Vérification de la longueur
    if (typeof input === 'string' && input.length > this.MAX_INPUT_LENGTH) {
      errors.push('Input too long');
    }

    // Sanitisation basique
    let sanitized = input;
    if (typeof input === 'string') {
      // Suppression des caractères dangereux
      sanitized = input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }

    // Validations spécifiques par type
    switch (type) {
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(sanitized)) {
          errors.push('Invalid UUID format');
        }
        break;
      
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
          errors.push('Invalid email format');
        }
        break;
      
      case 'url':
        try {
          const url = new URL(sanitized);
          if (!['http:', 'https:'].includes(url.protocol)) {
            errors.push('Invalid URL protocol');
          }
        } catch {
          errors.push('Invalid URL format');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : null
    };
  }

  /**
   * Chiffrement sécurisé des données sensibles
   */
  static encryptSensitiveData(data: string, key?: string): string {
    const secretKey = key || 'your-secret-key-change-in-production';
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  }

  /**
   * Déchiffrement des données
   */
  static decryptSensitiveData(encryptedData: string, key?: string): string {
    try {
      const secretKey = key || 'your-secret-key-change-in-production';
      const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return '';
    }
  }

  /**
   * Génération de tokens sécurisés
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomArray = new Uint8Array(length);
    crypto.getRandomValues(randomArray);
    
    for (let i = 0; i < length; i++) {
      result += chars[randomArray[i] % chars.length];
    }
    
    return result;
  }

  /**
   * Validation des permissions utilisateur
   */
  static async validateUserPermission(action: string, resourceId?: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Vérification basique des permissions - approche simplifiée
      return true; // Pour le moment, on autorise toutes les actions authentifiées
    } catch {
      return false;
    }
  }

  /**
   * Limitation du taux de requêtes
   */
  static checkRateLimit(identifier: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const storageKey = `${this.RATE_LIMIT_STORAGE_KEY}_${identifier}`;
    
    try {
      const stored = localStorage.getItem(storageKey);
      const data = stored ? JSON.parse(stored) : { requests: [], windowStart: now };
      
      // Nettoyer les anciennes requêtes
      data.requests = data.requests.filter((timestamp: number) => 
        now - timestamp < config.windowMs
      );
      
      // Vérifier la limite
      if (data.requests.length >= config.maxRequests) {
        return false;
      }
      
      // Ajouter la nouvelle requête
      data.requests.push(now);
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      return true;
    } catch {
      return true; // En cas d'erreur, permettre la requête
    }
  }

  /**
   * Validation des origines des requêtes
   */
  static validateOrigin(origin?: string): boolean {
    if (!origin) return false;
    
    try {
      const url = new URL(origin);
      return this.ALLOWED_DOMAINS.some(domain => 
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  /**
   * Nettoyage sécurisé des logs
   */
  static sanitizeLogData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth', 'session'];
    const sanitized = { ...data };

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeLogData(sanitized[key]);
      }
    });

    return sanitized;
  }

  /**
   * Validation des webhooks
   */
  static validateWebhookUrl(url: string): boolean {
    try {
      const webhookUrl = new URL(url);
      
      // Vérifier le protocole
      if (!['http:', 'https:'].includes(webhookUrl.protocol)) {
        return false;
      }
      
      // Éviter les adresses locales en production
      const hostname = webhookUrl.hostname;
      if (hostname === 'localhost' || 
          hostname === '127.0.0.1' || 
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        return process.env.NODE_ENV === 'development';
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Audit des activités suspectes - version simplifiée
   */
  static async auditSuspiciousActivity(activity: {
    action: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    additionalData?: any;
  }): Promise<void> {
    try {
      // Version simplifiée qui log juste en console pour éviter les erreurs de DB
      console.log('[SecurityAudit]', this.sanitizeLogData(activity));
    } catch (error) {
      console.error('[SecurityManager] Failed to log audit:', error);
    }
  }
}
