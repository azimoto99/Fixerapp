/**
 * Global Error Handler for Database Timeout and Connection Issues
 * Prevents application crashes from unhandled database errors
 */

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private lastErrorTime: Map<string, number> = new Map();
  private readonly ERROR_THRESHOLD = 5; // Max errors per minute
  private readonly TIME_WINDOW = 60000; // 1 minute

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  setupGlobalHandlers() {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.handleError('unhandledRejection', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.handleError('uncaughtException', error);
    });

    // Handle specific database timeout errors
    process.on('warning', (warning: any) => {
      if (warning.name === 'TimeoutWarning' || warning.message?.includes('timeout')) {
        this.handleError('timeoutWarning', warning);
      }
    });
  }

  private handleError(type: string, error: any) {
    const errorKey = `${type}_${error.code || error.name || 'unknown'}`;
    const now = Date.now();
    
    // Check if this is a database timeout error
    if (this.isDatabaseTimeoutError(error)) {
      this.handleDatabaseTimeout(error);
      return;
    }

    // Rate limiting for error logging
    const lastTime = this.lastErrorTime.get(errorKey) || 0;
    const count = this.errorCounts.get(errorKey) || 0;

    if (now - lastTime > this.TIME_WINDOW) {
      // Reset counter after time window
      this.errorCounts.set(errorKey, 1);
      this.lastErrorTime.set(errorKey, now);
      this.logError(type, error);
    } else if (count < this.ERROR_THRESHOLD) {
      // Increment counter within time window
      this.errorCounts.set(errorKey, count + 1);
      this.logError(type, error);
    }
    // Silently ignore errors that exceed threshold to prevent log spam
  }

  private isDatabaseTimeoutError(error: any): boolean {
    if (!error) return false;
    
    const timeoutIndicators = [
      'statement timeout',
      'canceling statement due to statement timeout',
      'code: \'57014\'',
      'timeout',
      'connection timeout',
      'query timeout'
    ];

    const errorString = JSON.stringify(error).toLowerCase();
    return timeoutIndicators.some(indicator => errorString.includes(indicator));
  }

  private handleDatabaseTimeout(error: any) {
    // Silently handle database timeouts to prevent log spam
    // These are expected in production environments
    const now = Date.now();
    const lastLog = this.lastErrorTime.get('db_timeout') || 0;
    
    // Only log once per minute
    if (now - lastLog > 60000) {
      console.warn('⏰ Database timeout detected (this is normal in production)');
      this.lastErrorTime.set('db_timeout', now);
    }
  }

  private logError(type: string, error: any) {
    // Only log non-timeout errors
    if (!this.isDatabaseTimeoutError(error)) {
      console.error(`🚨 ${type}:`, {
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n').slice(0, 3).join('\n') // Truncate stack trace
      });
    }
  }

  // Method to check if the application should continue running
  shouldContinue(error: any): boolean {
    // Always continue for database timeout errors
    if (this.isDatabaseTimeoutError(error)) {
      return true;
    }

    // Continue for most database connection errors
    const recoverableErrors = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ECONNRESET',
      'EPIPE',
      'connection terminated'
    ];

    return recoverableErrors.some(code => 
      error.code === code || error.message?.includes(code)
    );
  }
}

// Initialize global error handler
export const globalErrorHandler = GlobalErrorHandler.getInstance();
