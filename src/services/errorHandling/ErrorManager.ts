/**
 * Centralized Error Management System
 * Handles all error types with proper logging and user feedback
 */

import { toast } from 'sonner';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AppError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: Record<string, any>;
  originalError?: Error;
}

export class ErrorManager {
  private static errorLog: AppError[] = [];
  private static readonly MAX_LOG_SIZE = 100;

  /**
   * Handle errors with appropriate user feedback and logging
   */
  static handleError(
    error: Error | string,
    context?: {
      code?: string;
      severity?: ErrorSeverity;
      userMessage?: string;
      metadata?: Record<string, any>;
      silent?: boolean;
    }
  ): AppError {
    const appError: AppError = {
      code: context?.code || 'UNKNOWN_ERROR',
      message: typeof error === 'string' ? error : error.message,
      severity: context?.severity || 'medium',
      timestamp: new Date(),
      context: context?.metadata,
      originalError: typeof error === 'string' ? undefined : error,
    };

    // Log error
    this.logError(appError);

    // Show user feedback based on severity
    if (!context?.silent) {
      this.showUserFeedback(appError, context?.userMessage);
    }

    // Send to monitoring service if critical
    if (appError.severity === 'critical') {
      this.reportCriticalError(appError);
    }

    return appError;
  }

  /**
   * Log error to internal storage
   */
  private static logError(error: AppError): void {
    this.errorLog.push(error);
    
    // Keep only last MAX_LOG_SIZE errors
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog.shift();
    }

    // Console log with proper formatting
    const logLevel = this.getLogLevel(error.severity);
    console[logLevel](`[${error.code}] ${error.message}`, {
      timestamp: error.timestamp.toISOString(),
      context: error.context,
      stack: error.originalError?.stack,
    });
  }

  /**
   * Show appropriate user feedback
   */
  private static showUserFeedback(error: AppError, customMessage?: string): void {
    const message = customMessage || this.getUserFriendlyMessage(error);

    switch (error.severity) {
      case 'critical':
        toast.error(message, {
          duration: 10000,
          description: 'Notre équipe a été notifiée. Veuillez réessayer plus tard.',
        });
        break;
      case 'high':
        toast.error(message, { duration: 7000 });
        break;
      case 'medium':
        toast.warning(message, { duration: 5000 });
        break;
      case 'low':
        toast.info(message, { duration: 3000 });
        break;
    }
  }

  /**
   * Get user-friendly error message
   */
  private static getUserFriendlyMessage(error: AppError): string {
    const errorMessages: Record<string, string> = {
      NETWORK_ERROR: 'Erreur de connexion. Vérifiez votre connexion internet.',
      AUTH_ERROR: 'Erreur d\'authentification. Veuillez vous reconnecter.',
      VALIDATION_ERROR: 'Les données saisies sont invalides.',
      SESSION_ERROR: 'Votre session a expiré. Veuillez actualiser la page.',
      API_ERROR: 'Erreur lors de la communication avec le serveur.',
      DATABASE_ERROR: 'Erreur lors de l\'accès aux données.',
      PERMISSION_ERROR: 'Vous n\'avez pas les permissions nécessaires.',
      RATE_LIMIT_ERROR: 'Trop de requêtes. Veuillez patienter.',
      UNKNOWN_ERROR: 'Une erreur inattendue s\'est produite.',
    };

    return errorMessages[error.code] || error.message;
  }

  /**
   * Report critical errors to monitoring service
   */
  private static reportCriticalError(error: AppError): void {
    // TODO: Integrate with monitoring service (Sentry, LogRocket, etc.)
    console.error('🚨 CRITICAL ERROR REPORTED:', {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      context: error.context,
      stack: error.originalError?.stack,
    });
  }

  /**
   * Get console log level based on severity
   */
  private static getLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'low':
        return 'log';
      case 'medium':
        return 'warn';
      case 'high':
      case 'critical':
        return 'error';
    }
  }

  /**
   * Get recent errors for debugging
   */
  static getRecentErrors(limit: number = 20): AppError[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get errors by severity
   */
  static getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errorLog.filter(err => err.severity === severity);
  }

  /**
   * Check if there are recent critical errors
   */
  static hasRecentCriticalErrors(withinMinutes: number = 5): boolean {
    const threshold = new Date(Date.now() - withinMinutes * 60 * 1000);
    return this.errorLog.some(
      err => err.severity === 'critical' && err.timestamp > threshold
    );
  }
}
