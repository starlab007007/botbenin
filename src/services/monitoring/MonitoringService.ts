/**
 * Monitoring and Logging Service
 * Provides structured logging and performance monitoring
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class MonitoringService {
  private static logs: LogEntry[] = [];
  private static metrics: PerformanceMetric[] = [];
  private static readonly MAX_LOGS = 500;
  private static readonly MAX_METRICS = 200;

  // ============================================================================
  // LOGGING
  // ============================================================================

  /**
   * Log debug message
   */
  static debug(category: string, message: string, context?: Record<string, any>): void {
    this.log('debug', category, message, context);
  }

  /**
   * Log info message
   */
  static info(category: string, message: string, context?: Record<string, any>): void {
    this.log('info', category, message, context);
  }

  /**
   * Log warning
   */
  static warn(category: string, message: string, context?: Record<string, any>): void {
    this.log('warn', category, message, context);
  }

  /**
   * Log error
   */
  static error(category: string, message: string, context?: Record<string, any>): void {
    this.log('error', category, message, context);
  }

  /**
   * Log critical error
   */
  static critical(category: string, message: string, context?: Record<string, any>): void {
    this.log('critical', category, message, context);
  }

  /**
   * Core logging function
   */
  private static log(
    level: LogLevel,
    category: string,
    message: string,
    context?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      context,
    };

    // Add to internal log
    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    // Console output with formatting
    const emoji = this.getLogEmoji(level);
    const formattedMessage = `${emoji} [${category}] ${message}`;

    switch (level) {
      case 'debug':
        console.log(formattedMessage, context || '');
        break;
      case 'info':
        console.info(formattedMessage, context || '');
        break;
      case 'warn':
        console.warn(formattedMessage, context || '');
        break;
      case 'error':
      case 'critical':
        console.error(formattedMessage, context || '');
        break;
    }

    // Send critical logs to external service
    if (level === 'critical') {
      this.sendToExternalMonitoring(entry);
    }
  }

  /**
   * Get emoji for log level
   */
  private static getLogEmoji(level: LogLevel): string {
    const emojis: Record<LogLevel, string> = {
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      critical: '🚨',
    };
    return emojis[level];
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  /**
   * Start performance measurement
   */
  static startMeasure(name: string): () => void {
    const startTime = performance.now();

    return (metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, metadata);
    };
  }

  /**
   * Measure async operation
   */
  static async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, { ...metadata, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, { ...metadata, success: false, error: String(error) });
      throw error;
    }
  }

  /**
   * Record performance metric
   */
  private static recordMetric(
    name: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      metadata,
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log slow operations
    if (duration > 3000) {
      this.warn('Performance', `Slow operation: ${name} took ${duration.toFixed(0)}ms`, {
        duration,
        ...metadata,
      });
    }

    console.log(`⏱️ [Performance] ${name}: ${duration.toFixed(2)}ms`, metadata || '');
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Get logs by category
   */
  static getLogsByCategory(category: string, limit: number = 50): LogEntry[] {
    return this.logs
      .filter(log => log.category === category)
      .slice(-limit);
  }

  /**
   * Get logs by level
   */
  static getLogsByLevel(level: LogLevel, limit: number = 50): LogEntry[] {
    return this.logs
      .filter(log => log.level === level)
      .slice(-limit);
  }

  /**
   * Get performance metrics
   */
  static getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return this.metrics;
  }

  /**
   * Get average duration for a metric
   */
  static getAverageDuration(name: string): number | null {
    const metrics = this.metrics.filter(m => m.name === name);
    if (metrics.length === 0) return null;

    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }

  /**
   * Get performance summary
   */
  static getPerformanceSummary(): Record<string, {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
  }> {
    const summary: Record<string, any> = {};

    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          total: 0,
          min: Infinity,
          max: -Infinity,
        };
      }

      summary[metric.name].count++;
      summary[metric.name].total += metric.duration;
      summary[metric.name].min = Math.min(summary[metric.name].min, metric.duration);
      summary[metric.name].max = Math.max(summary[metric.name].max, metric.duration);
    });

    // Calculate averages
    Object.keys(summary).forEach(key => {
      summary[key].avgDuration = summary[key].total / summary[key].count;
      delete summary[key].total;
      summary[key].minDuration = summary[key].min;
      summary[key].maxDuration = summary[key].max;
      delete summary[key].min;
      delete summary[key].max;
    });

    return summary;
  }

  // ============================================================================
  // EXTERNAL MONITORING
  // ============================================================================

  /**
   * Send log to external monitoring service
   */
  private static sendToExternalMonitoring(entry: LogEntry): void {
    // TODO: Integrate with external monitoring (Sentry, Datadog, etc.)
    console.log('📡 Sending to external monitoring:', entry);
  }

  /**
   * Export logs for analysis
   */
  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all logs and metrics
   */
  static clear(): void {
    this.logs = [];
    this.metrics = [];
  }
}
