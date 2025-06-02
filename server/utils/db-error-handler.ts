import { Pool } from 'pg';
import { EventEmitter } from 'events';

const maxReconnectAttempts = 5;
const reconnectDelay = 5000; // 5 seconds

export class DatabaseErrorHandler extends EventEmitter {
  private pool: Pool;
  private reconnectAttempts = 0;
  private isReconnecting = false;

  constructor(pool: Pool) {
    super();
    this.pool = pool;
    this.setupErrorHandlers();
  }

  private setupErrorHandlers() {
    this.pool.on('error', (error: any) => {
      console.error('Postgres Pool Error:', error);
      
      if (error.code === 'XX000' || error.message.includes('db_termination')) {
        this.handleDatabaseTermination();
      }
    });
  }

  private async handleDatabaseTermination() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    while (this.reconnectAttempts < maxReconnectAttempts) {
      try {
        console.log(`Attempting to reconnect to database (attempt ${this.reconnectAttempts + 1}/${maxReconnectAttempts})...`);
        
        // Test the connection
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();

        console.log('Successfully reconnected to database');
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.emit('reconnected');
        return;
      } catch (error) {
        this.reconnectAttempts++;
        console.error(`Failed to reconnect (attempt ${this.reconnectAttempts}):`, error);
        
        if (this.reconnectAttempts < maxReconnectAttempts) {
          console.log(`Waiting ${reconnectDelay/1000} seconds before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, reconnectDelay));
        }
      }
    }

    console.error('Max reconnection attempts reached. Database connection could not be restored.');
    this.emit('reconnectFailed');
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
  }
}
