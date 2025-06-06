/**
 * Enhanced System Health Monitor for diagnosing connection issues
 */
import { Request, Response } from 'express';
import { systemMonitor } from '../system-monitor';
import { pool } from '../db';

interface DetailedHealthCheck {
  database: {
    status: 'healthy' | 'warning' | 'critical';
    responseTime: number;
    activeConnections: number;
    maxConnections: number;
    connectionDetails: any;
    error?: string;
  };
  websocket: {
    status: 'healthy' | 'warning' | 'critical';
    connectedUsers: number;
    activeRooms: number;
    uptime: number;
    error?: string;
  };
  memory: {
    status: 'healthy' | 'warning' | 'critical';
    used: number;
    free: number;
    total: number;
    usage: number;
  };
  system: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    loadAverage: number[];
    cpuUsage: number;
  };
  timestamp: string;
  overallStatus: 'healthy' | 'warning' | 'critical';
}

export async function getDetailedHealth(req: Request, res: Response) {
  try {
    const startTime = Date.now();
    
    // Database health check
    let dbHealth: DetailedHealthCheck['database'];
    try {
      const dbStart = Date.now();
      if (pool) {
        const result = await pool.query('SELECT 1, NOW() as server_time, version() as version');
        const dbResponseTime = Date.now() - dbStart;
        
        dbHealth = {
          status: dbResponseTime < 500 ? 'healthy' : dbResponseTime < 1000 ? 'warning' : 'critical',
          responseTime: dbResponseTime,
          activeConnections: pool.totalCount,
          maxConnections: pool.maxPoolSize,
          connectionDetails: {
            waiting: pool.waitingCount,
            idle: pool.idleCount,
            total: pool.totalCount
          }
        };
      } else {
        dbHealth = {
          status: 'critical',
          responseTime: 0,
          activeConnections: 0,
          maxConnections: 0,
          connectionDetails: {},
          error: 'Database pool not initialized'
        };
      }
    } catch (error) {
      dbHealth = {
        status: 'critical',
        responseTime: Date.now() - startTime,
        activeConnections: 0,
        maxConnections: 0,
        connectionDetails: {},
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }

    // Memory health check
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const freeMemory = totalMemory - usedMemory;
    const memoryPercent = (usedMemory / totalMemory) * 100;

    const memoryHealth: DetailedHealthCheck['memory'] = {
      status: memoryPercent < 70 ? 'healthy' : memoryPercent < 85 ? 'warning' : 'critical',
      used: usedMemory,
      free: freeMemory,
      total: totalMemory,
      usage: memoryPercent
    };

    // System health check
    const systemHealth: DetailedHealthCheck['system'] = {
      status: 'healthy',
      uptime: process.uptime(),
      loadAverage: [],
      cpuUsage: 0
    };

    // WebSocket health check (mock for now)
    const wsHealth: DetailedHealthCheck['websocket'] = {
      status: 'healthy',
      connectedUsers: 0,
      activeRooms: 0,
      uptime: process.uptime()
    };

    // Determine overall status
    const statuses = [dbHealth.status, memoryHealth.status, systemHealth.status, wsHealth.status];
    const overallStatus = statuses.includes('critical') ? 'critical' : 
                         statuses.includes('warning') ? 'warning' : 'healthy';

    const healthCheck: DetailedHealthCheck = {
      database: dbHealth,
      websocket: wsHealth,
      memory: memoryHealth,
      system: systemHealth,
      timestamp: new Date().toISOString(),
      overallStatus
    };

    res.json(healthCheck);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

export async function getConnectionDiagnostics(req: Request, res: Response) {
  try {
    const diagnostics = {
      database: {
        pool: pool ? {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
          max: pool.maxPoolSize
        } : null,
        connectionString: process.env.SUPABASE_DATABASE_URL ? 'configured' : 'missing'
      },
      websocket: {
        status: 'Service initialized',
        // Add WebSocket service diagnostics here when available
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT || 3000,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      timestamp: new Date().toISOString()
    };

    res.json(diagnostics);
  } catch (error) {
    console.error('Connection diagnostics failed:', error);
    res.status(500).json({
      error: 'Diagnostics failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
