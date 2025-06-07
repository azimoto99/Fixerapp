import { apiRequest } from '@/lib/queryClient';

interface RecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
}

export class StripeConnectRecovery {
  private static instance: StripeConnectRecovery;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private recoveryAttempts: Map<string, number>;

  private constructor(options: RecoveryOptions = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000;
    this.recoveryAttempts = new Map();
  }

  static getInstance(options?: RecoveryOptions): StripeConnectRecovery {
    if (!StripeConnectRecovery.instance) {
      StripeConnectRecovery.instance = new StripeConnectRecovery(options);
    }
    return StripeConnectRecovery.instance;
  }

  async recoverPendingSetup(): Promise<boolean> {
    const pendingSetup = localStorage.getItem('stripe-connect-pending');
    if (!pendingSetup) return false;

    const timestamp = localStorage.getItem('stripe-connect-timestamp');
    const sessionId = localStorage.getItem('stripe-connect-session');
    
    if (!timestamp || !sessionId) {
      this.cleanupPendingState();
      return false;
    }

    try {
      // Check if setup is still valid (less than 1 hour old)
      const setupTime = new Date(timestamp).getTime();
      const now = Date.now();
      if (now - setupTime > 60 * 60 * 1000) {
        this.cleanupPendingState();
        return false;
      }

      // Get current setup status
      const res = await apiRequest('GET', '/api/stripe/connect/account-status');
      if (!res.ok) throw new Error('Failed to check account status');
      
      const status = await res.json();
      
      // If account is active, clean up and complete
      if (status.isActive) {
        this.cleanupPendingState();
        return true;
      }

      // If requires attention, try to recover
      if (status.requiresAttention) {
        return await this.attemptRecovery(sessionId);
      }

      return false;
    } catch (error) {
      console.error('Error in recovery:', error);
      return false;
    }
  }

  private async attemptRecovery(sessionId: string): Promise<boolean> {
    const attempts = this.recoveryAttempts.get(sessionId) || 0;
    if (attempts >= this.maxRetries) {
      this.cleanupPendingState();
      return false;
    }    try {
      // Create new account link
      const res = await apiRequest('POST', '/api/stripe/connect/create-link');
      if (!res.ok) throw new Error('Failed to create recovery link');
      
      const { url } = await res.json();
      
      // Open new tab with recovery link
      window.open(url, '_blank');
      
      // Increment recovery attempts
      this.recoveryAttempts.set(sessionId, attempts + 1);
      
      // Update timestamp
      localStorage.setItem('stripe-connect-timestamp', new Date().toISOString());
      
      return true;
    } catch (error) {
      console.error('Recovery attempt failed:', error);
      return false;
    }
  }

  private cleanupPendingState() {
    localStorage.removeItem('stripe-connect-pending');
    localStorage.removeItem('stripe-connect-timestamp');
    localStorage.removeItem('stripe-connect-session');
  }
}
