import { Pool, Client } from 'pg';
import { EventEmitter } from 'events';

interface DatabaseConfig {
  maxRetries?: number;
  retryDelay?: number;
  maxConnections?: number;
}

export class DatabaseResilience extends EventEmitter {
  private pool: Pool;
  private maxRetries: number;
  private retryDelay: number;
  private isReconnecting: boolean = false;
  private connectionAttempts: number = 0;
  private lastError?: Error;

  constructor(pool: Pool, config: DatabaseConfig = {}) {
    super();
    this.pool = pool;
    this.maxRetries = config.maxRetries || 5;
    this.retryDelay = config.retryDelay || 5000;

    this.setupErrorHandlers();
  }

  private setupErrorHandlers() {
    this.pool.on('error', (err: Error, client: any) => {
      console.error('Unexpected database error:', err);
      this.lastError = err;

      if (err.message.includes('termination') || err.message.includes('connection')) {
        this.handleConnectionError(err);
      }

      // Remove errored client from pool
      if (client && typeof client.release === 'function') {
        client.release(true);
      }
    });

    this.pool.on('connect', (client: any) => {
      this.connectionAttempts = 0;
      this.lastError = undefined;
      this.emit('connected');

      client.on('error', (err: Error) => {
        console.error('Client error:', err);
        this.handleConnectionError(err);
      });
    });
  }

  private async handleConnectionError(err: Error) {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    while (this.connectionAttempts < this.maxRetries) {
      try {
        console.log(`Attempting database reconnection (attempt ${this.connectionAttempts + 1}/${this.maxRetries})...`);
        
        // Test connection with a simple query
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();

        console.log('Database reconnection successful');
        this.isReconnecting = false;
        this.emit('reconnected');
        return;
      } catch (error) {
        this.connectionAttempts++;
        console.error(`Reconnection attempt ${this.connectionAttempts} failed:`, error);
        
        if (this.connectionAttempts < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    this.emit('reconnection_failed', this.lastError);
    this.isReconnecting = false;
  }

  public async validateConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      return false;
    }
  }

  public getConnectionStatus() {
    return {
      isReconnecting: this.isReconnecting,
      connectionAttempts: this.connectionAttempts,
      lastError: this.lastError?.message,
      maxRetries: this.maxRetries
    };
  }
}
