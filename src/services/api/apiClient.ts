/**
 * Robust API Client with Retry Logic and Error Handling
 * Centralized HTTP client for all API calls
 */

import { RetryManager } from '../retry/RetryManager';
import { ErrorManager } from '../errorHandling/ErrorManager';
import { MonitoringService } from '../monitoring/MonitoringService';
import { validateData, apiSuccessSchema, apiErrorSchema } from '../validation/validationSchemas';

export interface ApiConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  retry?: boolean;
  maxRetries?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export class ApiClient {
  private config: Required<ApiConfig>;

  constructor(config: ApiConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      timeout: config.timeout || 30000,
      headers: config.headers || {},
      retry: config.retry !== false,
      maxRetries: config.maxRetries || 3,
    };
  }

  /**
   * GET request
   */
  async get<T = any>(
    url: string,
    config?: Partial<ApiConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: Partial<ApiConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: Partial<ApiConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: Partial<ApiConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: Partial<ApiConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  /**
   * Core request method
   */
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: Partial<ApiConfig>
  ): Promise<ApiResponse<T>> {
    const finalConfig = { ...this.config, ...config };
    const fullURL = finalConfig.baseURL + url;

    const operation = async () => {
      const startTime = performance.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout);

        const response = await fetch(fullURL, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...finalConfig.headers,
          },
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseData = await response.json().catch(() => ({}));

        const duration = performance.now() - startTime;
        MonitoringService.info('API', `${method} ${url}`, {
          status: response.status,
          duration,
          success: response.ok,
        });

        if (!response.ok) {
          throw this.createApiError(response, responseData);
        }

        return {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: this.extractHeaders(response.headers),
        };
      } catch (error) {
        const duration = performance.now() - startTime;
        MonitoringService.error('API', `${method} ${url} failed`, {
          duration,
          error: String(error),
        });

        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('TIMEOUT_ERROR');
        }

        throw error;
      }
    };

    try {
      if (finalConfig.retry) {
        return await RetryManager.executeWithRetry(operation, {
          maxAttempts: finalConfig.maxRetries,
        });
      } else {
        return await operation();
      }
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error(String(error));

      ErrorManager.handleError(apiError, {
        code: 'API_ERROR',
        severity: 'high',
        metadata: {
          method,
          url: fullURL,
          data,
        },
      });

      throw apiError;
    }
  }

  /**
   * Create API error from response
   */
  private createApiError(response: Response, data: any): Error {
    const errorMessage = data?.error?.message || data?.message || response.statusText;
    const error = new Error(errorMessage);
    error.name = `API_ERROR_${response.status}`;
    return error;
  }

  /**
   * Extract headers from response
   */
  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Set default header
   */
  setHeader(key: string, value: string): void {
    this.config.headers[key] = value;
  }

  /**
   * Remove default header
   */
  removeHeader(key: string): void {
    delete this.config.headers[key];
  }

  /**
   * Set authorization token
   */
  setAuthToken(token: string): void {
    this.setHeader('Authorization', `Bearer ${token}`);
  }

  /**
   * Clear authorization token
   */
  clearAuthToken(): void {
    this.removeHeader('Authorization');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
