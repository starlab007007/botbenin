
import { SecurityManager } from './SecurityManager';
import { supabase } from '@/integrations/supabase/client';

interface SecureMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SecureMessageHandler {
  private static readonly MAX_MESSAGE_LENGTH = 4000;
  private static readonly RATE_LIMIT_CONFIG = {
    windowMs: 60000, // 1 minute
    maxRequests: 20
  };

  /**
   * Envoi sécurisé d'un message
   */
  static async sendSecureMessage(
    botId: string,
    sessionToken: string,
    messageContent: string,
    messageType: 'user' | 'bot' = 'user'
  ): Promise<SecureMessageResult> {
    try {
      // Validation des entrées
      const botValidation = SecurityManager.validateAndSanitizeInput(botId, 'uuid');
      if (!botValidation.isValid) {
        return { success: false, error: 'ID de bot invalide' };
      }

      const sessionValidation = SecurityManager.validateAndSanitizeInput(sessionToken, 'string');
      if (!sessionValidation.isValid || !sessionToken.startsWith('anon_')) {
        return { success: false, error: 'Token de session invalide' };
      }

      const messageValidation = SecurityManager.validateAndSanitizeInput(messageContent, 'string');
      if (!messageValidation.isValid) {
        return { success: false, error: 'Contenu du message invalide' };
      }

      // Vérification de la longueur du message
      if (messageContent.length > this.MAX_MESSAGE_LENGTH) {
        return { success: false, error: 'Message trop long' };
      }

      // Limitation du taux
      const rateLimitKey = `message_${sessionToken}`;
      if (!SecurityManager.checkRateLimit(rateLimitKey, this.RATE_LIMIT_CONFIG)) {
        await SecurityManager.auditSuspiciousActivity({
          action: 'message_rate_limit_exceeded',
          additionalData: { sessionToken: sessionToken.substring(0, 10) + '...', botId }
        });
        return { success: false, error: 'Trop de messages envoyés' };
      }

      // Détection de contenu malveillant
      if (this.detectMaliciousContent(messageContent)) {
        await SecurityManager.auditSuspiciousActivity({
          action: 'malicious_content_detected',
          additionalData: { 
            sessionToken: sessionToken.substring(0, 10) + '...',
            botId,
            contentLength: messageContent.length
          }
        });
        return { success: false, error: 'Contenu non autorisé détecté' };
      }

      // Préparation des métadonnées sécurisées
      const secureMetadata = {
        session_token: sessionValidation.sanitized,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent ? navigator.userAgent.substring(0, 500) : 'unknown',
        content_hash: await this.generateContentHash(messageContent),
        security_validated: true
      };

      // Sauvegarde directe avec une approche simplifiée - utiliser chat_messages au lieu de bot_messages
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          bot_id: botValidation.sanitized,
          message_content: messageValidation.sanitized,
          message_type: messageType,
          metadata: SecurityManager.sanitizeLogData(secureMetadata)
        })
        .select('id')
        .single();

      if (error) {
        await SecurityManager.auditSuspiciousActivity({
          action: 'secure_message_save_failed',
          additionalData: { error: error.message, botId }
        });
        return { success: false, error: 'Échec de la sauvegarde sécurisée' };
      }

      await SecurityManager.auditSuspiciousActivity({
        action: 'secure_message_sent',
        additionalData: { 
          messageId: data?.id || 'unknown',
          botId,
          messageLength: messageContent.length
        }
      });

      return { success: true, messageId: data?.id || 'unknown' };
    } catch (error: any) {
      await SecurityManager.auditSuspiciousActivity({
        action: 'secure_message_error',
        additionalData: { error: error.message }
      });
      return { success: false, error: 'Erreur interne de sécurité' };
    }
  }

  /**
   * Détection de contenu malveillant
   */
  private static detectMaliciousContent(content: string): boolean {
    const maliciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /document\.cookie/gi,
      /window\.location/gi,
      /\.innerHTML/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /data:text\/html/gi,
      /vbscript:/gi
    ];

    return maliciousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Génération d'un hash de contenu pour l'intégrité
   */
  private static async generateContentHash(content: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return 'hash_generation_failed';
    }
  }

  /**
   * Récupération sécurisée de l'historique
   */
  static async getSecureHistory(
    botId: string,
    sessionToken: string,
    limit: number = 50
  ): Promise<{ success: boolean; messages?: any[]; error?: string }> {
    try {
      // Validation des entrées
      const botValidation = SecurityManager.validateAndSanitizeInput(botId, 'uuid');
      if (!botValidation.isValid) {
        return { success: false, error: 'ID de bot invalide' };
      }

      const sessionValidation = SecurityManager.validateAndSanitizeInput(sessionToken, 'string');
      if (!sessionValidation.isValid) {
        return { success: false, error: 'Token de session invalide' };
      }

      // Limitation de la pagination
      const safeLimit = Math.min(Math.max(1, limit), 100);

      // Récupération directe avec une approche simplifiée - utiliser chat_messages au lieu de bot_messages
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('bot_id', botValidation.sanitized)
        .order('created_at', { ascending: true })
        .limit(safeLimit);

      if (error) {
        await SecurityManager.auditSuspiciousActivity({
          action: 'secure_history_fetch_failed',
          additionalData: { error: error.message, botId }
        });
        return { success: false, error: 'Échec de récupération sécurisée' };
      }

      // Sanitisation des données retournées
      const sanitizedMessages = (data || []).map((msg: any) => ({
        ...msg,
        message_content: SecurityManager.validateAndSanitizeInput(
          msg.message_content, 'string'
        ).sanitized,
        metadata: SecurityManager.sanitizeLogData(msg.metadata || {})
      }));

      return { success: true, messages: sanitizedMessages };
    } catch (error: any) {
      await SecurityManager.auditSuspiciousActivity({
        action: 'secure_history_error',
        additionalData: { error: error.message }
      });
      return { success: false, error: 'Erreur interne de sécurité' };
    }
  }
}
