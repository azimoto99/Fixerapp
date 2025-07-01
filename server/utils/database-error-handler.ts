import { Pool } from 'pg';
import { EventEmitter } from 'events';

export class DatabaseErrorHandler extends EventEmitter {
  private pool: Pool;
  private isReconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectDelay: number = 5000;

  constructor(pool: Pool) {
    super();
    this.pool = pool;
    this.setupErrorHandling();
    this.startHealthCheck();
  }

  private setupErrorHandling() {
    this.pool.on('error', async (error) => {
      console.error('Database pool error:', error);
      
      if ((error as any).code === 'XX000' && error.message.includes('db_termination')) {
        await this.handleDisconnect();
      }
      
      this.emit('error', error);
    });
  }

  private async handleDisconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this.emit('disconnect');

    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        console.log(`Attempting database reconnection (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
        
        // Test connection
        await this.pool.query('SELECT 1');
        
        console.log('Database connection restored');
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.emit('reconnect');
        return;
      } catch (error) {
        this.reconnectAttempts++;
        console.error(`Reconnection attempt failed:`, error);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        }
      }
    }

    this.emit('reconnectFailed');
    console.error('Max reconnection attempts reached');
  }

  private startHealthCheck() {
    setInterval(async () => {
      try {
        await this.pool.query('SELECT 1');
      } catch (error) {
        console.error('Database health check failed:', error);
        if (!this.isReconnecting) {
          await this.handleDisconnect();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  public async executeWithRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.log(`Retrying operation, ${retries} attempts remaining`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = ['40001', '40P01', 'XX000', '08006'];
    return retryableCodes.includes(error.code) ||
           error.message.includes('deadlock') ||
           error.message.includes('connection terminated');
  }
}
