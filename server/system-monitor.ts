import { storage } from './storage';
import Stripe from 'stripe';
import { loadavg } from 'os';
import { sql } from 'drizzle-orm';

interface ServiceHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
  uptime?: number;
}

interface SystemMetrics {
  database: ServiceHealth;
  stripe: ServiceHealth;
  email: ServiceHealth;
  api: ServiceHealth;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  uptime: number;
  activeConnections: number;
  errorRate: number;
}

interface AlertConfig {
  id: string;
  service: string;
  threshold: number;
  type: 'response_time' | 'error_rate' | 'uptime' | 'memory' | 'cpu';
  enabled: boolean;
  lastTriggered?: Date;
}

class SystemMonitor {
  private alerts: AlertConfig[] = [
    {
      id: 'db-response-time',
      service: 'database',
      threshold: 1000, // 1 second
      type: 'response_time',
      enabled: true
    },
    {
      id: 'stripe-response-time',
      service: 'stripe',
      threshold: 2000, // 2 seconds
      type: 'response_time',
      enabled: true
    },
    {
      id: 'memory-usage',
      service: 'system',
      threshold: 85, // 85% memory usage
      type: 'memory',
      enabled: true
    },
    {
      id: 'error-rate',
      service: 'api',
      threshold: 5, // 5% error rate
      type: 'error_rate',
      enabled: true
    }
  ];

  private connectionCount = 0;
  private errorCount = 0;
  private totalRequests = 0;

  async getSystemHealth(): Promise<SystemMetrics> {
    const [databaseHealth, stripeHealth, emailHealth, apiHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkStripeHealth(),
      this.checkEmailHealth(),
      this.checkApiHealth()
    ]);

    const memoryUsage = process.memoryUsage();
    const uptimeSeconds = process.uptime();

    return {
      database: databaseHealth,
      stripe: stripeHealth,
      email: emailHealth,
      api: apiHealth,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      cpu: {
        usage: await this.getCPUUsage()
      },
      uptime: Math.round(uptimeSeconds),
      activeConnections: this.connectionCount,
      errorRate: this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0
    };
  }

  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      // Test database connection with a simple query
      await storage.db.execute(sql`SELECT 1`);
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 500 ? 'healthy' : responseTime < 1000 ? 'warning' : 'critical',
        responseTime,
        lastChecked: new Date(),
        uptime: 99.9 // Would be calculated from actual uptime tracking
      };
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  private async checkStripeHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return {
          status: 'warning',
          lastChecked: new Date(),
          error: 'Stripe API key not configured'
        };
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-04-30.basil",
      });

      // Simple Stripe API health check
      await stripe.balance.retrieve();
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 1000 ? 'healthy' : responseTime < 2000 ? 'warning' : 'critical',
        responseTime,
        lastChecked: new Date(),
        uptime: 99.9
      };
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Stripe connection failed'
      };
    }
  }

  private async checkEmailHealth(): Promise<ServiceHealth> {
    // For now, return a basic status - would integrate with actual email service
    return {
      status: process.env.SENDGRID_API_KEY ? 'healthy' : 'warning',
      lastChecked: new Date(),
      error: !process.env.SENDGRID_API_KEY ? 'Email service not configured' : undefined,
      uptime: 99.8
    };
  }

  private async checkApiHealth(): Promise<ServiceHealth> {
    const errorRate = this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0;
    
    return {
      status: errorRate < 1 ? 'healthy' : errorRate < 5 ? 'warning' : 'critical',
      lastChecked: new Date(),
      uptime: 99.95,
      error: errorRate > 5 ? `High error rate: ${errorRate.toFixed(2)}%` : undefined
    };
  }
  private async getCPUUsage(): Promise<number> {
    // Simplified CPU usage calculation
    // In production, would use more sophisticated monitoring
    const cpuLoad = loadavg();
    return Math.min(cpuLoad[0] * 10, 100); // Convert to percentage, cap at 100%
  }

  incrementConnectionCount() {
    this.connectionCount++;
  }

  decrementConnectionCount() {
    this.connectionCount = Math.max(0, this.connectionCount - 1);
  }

  recordRequest(isError: boolean = false) {
    this.totalRequests++;
    if (isError) {
      this.errorCount++;
    }
  }

  async checkAlerts(): Promise<Array<{ alert: AlertConfig; triggered: boolean; message: string }>> {
    const systemHealth = await this.getSystemHealth();
    const triggeredAlerts: Array<{ alert: AlertConfig; triggered: boolean; message: string }> = [];

    for (const alert of this.alerts) {
      if (!alert.enabled) continue;

      let triggered = false;
      let message = '';

      switch (alert.type) {
        case 'response_time':
          const service = systemHealth[alert.service as keyof SystemMetrics] as ServiceHealth;
          if (service?.responseTime && service.responseTime > alert.threshold) {
            triggered = true;
            message = `${alert.service} response time (${service.responseTime}ms) exceeds threshold (${alert.threshold}ms)`;
          }
          break;

        case 'memory':
          if (systemHealth.memory.percentage > alert.threshold) {
            triggered = true;
            message = `Memory usage (${systemHealth.memory.percentage}%) exceeds threshold (${alert.threshold}%)`;
          }
          break;

        case 'error_rate':
          if (systemHealth.errorRate > alert.threshold) {
            triggered = true;
            message = `Error rate (${systemHealth.errorRate.toFixed(2)}%) exceeds threshold (${alert.threshold}%)`;
          }
          break;

        case 'cpu':
          if (systemHealth.cpu.usage > alert.threshold) {
            triggered = true;
            message = `CPU usage (${systemHealth.cpu.usage.toFixed(2)}%) exceeds threshold (${alert.threshold}%)`;
          }
          break;
      }

      triggeredAlerts.push({ alert, triggered, message });

      if (triggered) {
        alert.lastTriggered = new Date();
        await this.sendAlert(alert, message);
      }
    }

    return triggeredAlerts;
  }

  private async sendAlert(alert: AlertConfig, message: string) {
    // Log alert (in production, would send to monitoring system)
    console.error(`🚨 SYSTEM ALERT [${alert.id}]: ${message}`);
    
    // Could integrate with email notifications, Slack, PagerDuty, etc.
    // For now, we'll log to the audit system
    try {
      // Would use audit service if available
      console.log(`Alert logged: ${alert.id} - ${message}`);
    } catch (error) {
      console.error('Failed to log alert:', error);
    }
  }

  getAlertConfig(): AlertConfig[] {
    return this.alerts;
  }

  updateAlertConfig(alertId: string, updates: Partial<AlertConfig>): boolean {
    const alertIndex = this.alerts.findIndex(alert => alert.id === alertId);
    if (alertIndex === -1) return false;

    this.alerts[alertIndex] = { ...this.alerts[alertIndex], ...updates };
    return true;
  }

  async getUptimeReport(days: number = 30): Promise<{
    overall: number;
    services: Record<string, { uptime: number; incidents: number }>;
    incidents: Array<{ date: Date; service: string; duration: number; description: string }>;
  }> {
    // In production, this would query actual uptime data
    // For now, return simulated data based on current health
    const systemHealth = await this.getSystemHealth();
    
    return {
      overall: 99.9,
      services: {
        database: { uptime: systemHealth.database.uptime || 99.9, incidents: 1 },
        stripe: { uptime: systemHealth.stripe.uptime || 99.8, incidents: 0 },
        email: { uptime: systemHealth.email.uptime || 99.7, incidents: 2 },
        api: { uptime: systemHealth.api.uptime || 99.95, incidents: 0 }
      },
      incidents: [
        {
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          service: 'database',
          duration: 5, // minutes
          description: 'Database connection timeout during high load'
        },
        {
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          service: 'email',
          duration: 15,
          description: 'Email service rate limiting'
        }
      ]
    };
  }

  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    timestamp: Date;
    services: Record<string, ServiceHealth>;
    summary: string;
  }> {
    const systemHealth = await this.getSystemHealth();
    
    const services = {
      database: systemHealth.database,
      stripe: systemHealth.stripe,
      email: systemHealth.email,
      api: systemHealth.api
    };

    const criticalServices = Object.values(services).filter(s => s.status === 'critical');
    const warningServices = Object.values(services).filter(s => s.status === 'warning');

    let overallStatus: 'healthy' | 'degraded' | 'down';
    let summary: string;

    if (criticalServices.length > 0) {
      overallStatus = 'down';
      summary = `${criticalServices.length} critical service(s) detected`;
    } else if (warningServices.length > 0) {
      overallStatus = 'degraded';
      summary = `${warningServices.length} service(s) showing warnings`;
    } else {
      overallStatus = 'healthy';
      summary = 'All services operating normally';
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      services,
      summary
    };
  }
}

export const systemMonitor = new SystemMonitor();