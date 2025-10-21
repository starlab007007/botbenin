/**
 * Retry Manager with Exponential Backoff
 * Handles automatic retries for failed operations
 */

import { ErrorManager } from '../errorHandling/ErrorManager';

export interface RetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    const retryableErrors = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
    ];
    return retryableErrors.some(code => 
      error.message.includes(code) || error.name.includes(code)
    );
  },
  onRetry: () => {},
};

export class RetryManager {
  /**
   * Execute operation with automatic retry on failure
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = {}
  ): Promise<T> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        if (!finalConfig.shouldRetry(lastError)) {
          throw lastError;
        }

        // Last attempt - throw error
        if (attempt === finalConfig.maxAttempts) {
          ErrorManager.handleError(lastError, {
            code: 'RETRY_EXHAUSTED',
            severity: 'high',
            userMessage: 'L\'opération a échoué après plusieurs tentatives',
            metadata: { attempts: attempt },
          });
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.initialDelayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
          finalConfig.maxDelayMs
        );

        // Notify retry callback
        finalConfig.onRetry(attempt, lastError);

        // Log retry attempt
        console.warn(`🔄 Retry attempt ${attempt}/${finalConfig.maxAttempts} after ${delay}ms`, {
          error: lastError.message,
          nextAttemptIn: delay,
        });

        // Wait before next attempt
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Retry with custom predicate for specific errors
   */
  static async retryOnCondition<T>(
    operation: () => Promise<T>,
    condition: (error: Error) => boolean,
    maxAttempts: number = 3
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxAttempts,
      shouldRetry: condition,
    });
  }

  /**
   * Retry specifically for network operations
   */
  static async retryNetworkOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxAttempts,
      initialDelayMs: 2000,
      shouldRetry: (error) => {
        return (
          error.message.includes('network') ||
          error.message.includes('fetch') ||
          error.message.includes('timeout') ||
          error.message.includes('ECONNREFUSED')
        );
      },
    });
  }

  /**
   * Retry with linear backoff (for rate limiting)
   */
  static async retryWithLinearBackoff<T>(
    operation: () => Promise<T>,
    delayMs: number = 1000,
    maxAttempts: number = 5
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxAttempts,
      initialDelayMs: delayMs,
      backoffMultiplier: 1, // Linear, not exponential
      maxDelayMs: delayMs * maxAttempts,
    });
  }

  /**
   * Execute multiple operations with retry, stopping on first success
   */
  static async retryMultipleStrategies<T>(
    strategies: Array<() => Promise<T>>
  ): Promise<T> {
    let lastError: Error;

    for (const strategy of strategies) {
      try {
        return await this.executeWithRetry(strategy, { maxAttempts: 2 });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn('Strategy failed, trying next...', lastError.message);
      }
    }

    throw lastError!;
  }

  /**
   * Retry with timeout
   */
  static async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    return Promise.race([
      operation(),
      this.createTimeoutPromise<T>(timeoutMs),
    ]);
  }

  /**
   * Combine retry with timeout
   */
  static async executeWithRetryAndTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 30000,
    retryConfig: RetryConfig = {}
  ): Promise<T> {
    return this.executeWithRetry(
      () => this.executeWithTimeout(operation, timeoutMs),
      retryConfig
    );
  }

  /**
   * Helper: Create timeout promise
   */
  private static createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Helper: Delay execution
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: Error): boolean {
    return DEFAULT_CONFIG.shouldRetry(error);
  }
}
