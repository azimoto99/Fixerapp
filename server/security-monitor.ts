import { storage } from './storage';
import { auditService } from './audit-service';

// Security Monitoring Service for Plan Bravo Implementation
export interface SecurityIncident {
  id: number;
  timestamp: Date;
  type: 'suspicious_login' | 'multiple_failures' | 'unusual_activity' | 'admin_escalation' | 'payment_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: number;
  ipAddress: string;
  userAgent: string;
  description: string;
  metadata: any;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: number;
  resolvedAt?: Date;
  notes?: string;
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private incidents: SecurityIncident[] = [];
  private loginAttempts = new Map<string, { count: number; lastAttempt: Date; blocked: boolean }>();
  private currentId = 1;

  public static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  // Track login attempts and detect suspicious patterns
  async trackLoginAttempt(params: {
    ipAddress: string;
    userAgent: string;
    success: boolean;
    userId?: number;
    username?: string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    const key = `${params.ipAddress}:${params.username || 'unknown'}`;
    const now = new Date();
    
    let attempts = this.loginAttempts.get(key) || { count: 0, lastAttempt: now, blocked: false };
    
    // Reset counter if last attempt was more than 15 minutes ago
    if (now.getTime() - attempts.lastAttempt.getTime() > 15 * 60 * 1000) {
      attempts = { count: 0, lastAttempt: now, blocked: false };
    }

    if (params.success) {
      // Successful login - reset attempts
      this.loginAttempts.delete(key);
      
      // Check for suspicious successful login patterns
      await this.checkSuspiciousLogin(params);
      return { allowed: true };
    } else {
      // Failed login attempt
      attempts.count++;
      attempts.lastAttempt = now;
      
      // Block after 5 failed attempts
      if (attempts.count >= 5) {
        attempts.blocked = true;
        
        await this.createSecurityIncident({
          type: 'multiple_failures',
          severity: 'medium',
          userId: params.userId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          description: `Multiple failed login attempts from IP ${params.ipAddress}`,
          metadata: {
            username: params.username,
            attemptCount: attempts.count,
            timeWindow: '15 minutes'
          }
        });
        
        this.loginAttempts.set(key, attempts);
        return { allowed: false, reason: 'Too many failed attempts. Please try again in 15 minutes.' };
      }
      
      this.loginAttempts.set(key, attempts);
      return { allowed: true };
    }
  }

  // Check for suspicious login patterns
  private async checkSuspiciousLogin(params: {
    ipAddress: string;
    userAgent: string;
    userId?: number;
  }): Promise<void> {
    if (!params.userId) return;

    try {
      const user = await storage.getUser(params.userId);
      if (!user) return;

      // Check for login from new location (simplified - in production would use GeoIP)
      const isUnusualLocation = this.isUnusualLocation(params.ipAddress, user.id);
      
      // Check for login with different user agent pattern
      const isUnusualDevice = this.isUnusualDevice(params.userAgent, user.id);

      if (isUnusualLocation || isUnusualDevice) {
        await this.createSecurityIncident({
          type: 'suspicious_login',
          severity: isUnusualLocation ? 'high' : 'medium',
          userId: params.userId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          description: `Suspicious login detected for user ${user.username}`,
          metadata: {
            unusualLocation: isUnusualLocation,
            unusualDevice: isUnusualDevice,
            userEmail: user.email
          }
        });
      }
    } catch (error) {
      console.error('Error checking suspicious login:', error);
    }
  }

  // Simplified location check (in production would use proper GeoIP)
  private isUnusualLocation(ipAddress: string, userId: number): boolean {
    // For now, flag any IP that starts with different patterns as "unusual"
    const ipPrefix = ipAddress.split('.')[0];
    return parseInt(ipPrefix) > 200 || parseInt(ipPrefix) < 10;
  }

  // Check for unusual device patterns
  private isUnusualDevice(userAgent: string, userId: number): boolean {
    // Flag automated tools or unusual user agents
    const suspiciousPatterns = ['bot', 'crawler', 'curl', 'wget', 'python', 'postman'];
    return suspiciousPatterns.some(pattern => 
      userAgent.toLowerCase().includes(pattern)
    );
  }

  // Monitor payment anomalies
  async monitorPaymentActivity(params: {
    userId: number;
    amount: number;
    ipAddress: string;
    userAgent: string;
    jobId: number;
  }): Promise<void> {
    try {
      // Check for unusually high payments
      if (params.amount > 1000) {
        await this.createSecurityIncident({
          type: 'payment_anomaly',
          severity: 'medium',
          userId: params.userId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          description: `High-value payment detected: $${params.amount}`,
          metadata: {
            amount: params.amount,
            jobId: params.jobId,
            threshold: 1000
          }
        });
      }

      // Check for rapid successive payments
      const recentPayments = await this.getRecentPaymentsByUser(params.userId, 5); // Last 5 minutes
      if (recentPayments.length > 3) {
        await this.createSecurityIncident({
          type: 'payment_anomaly',
          severity: 'high',
          userId: params.userId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          description: `Rapid successive payments detected`,
          metadata: {
            paymentCount: recentPayments.length,
            timeWindow: '5 minutes',
            amounts: recentPayments.map(p => p.amount)
          }
        });
      }
    } catch (error) {
      console.error('Error monitoring payment activity:', error);
    }
  }

  // Get recent payments for a user (simplified implementation)
  private async getRecentPaymentsByUser(userId: number, minutesBack: number): Promise<any[]> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return [];
      
      // This is a simplified implementation - in production would query actual payment records
      const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000);
      return []; // Would return actual recent payments
    } catch (error) {
      console.error('Error getting recent payments:', error);
      return [];
    }
  }

  // Create security incident
  async createSecurityIncident(params: {
    type: SecurityIncident['type'];
    severity: SecurityIncident['severity'];
    userId?: number;
    ipAddress: string;
    userAgent: string;
    description: string;
    metadata: any;
  }): Promise<SecurityIncident> {
    const incident: SecurityIncident = {
      id: this.currentId++,
      timestamp: new Date(),
      type: params.type,
      severity: params.severity,
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      description: params.description,
      metadata: params.metadata,
      status: 'open'
    };

    this.incidents.push(incident);

    // Log security incident in audit trail
    await auditService.logFinancialTransaction({
      userId: params.userId || 0,
      action: 'security_incident_created',
      entityType: 'user',
      entityId: params.userId || 0,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        incidentType: params.type,
        severity: params.severity,
        description: params.description,
        incidentId: incident.id
      }
    });

    console.log(`[SECURITY INCIDENT] ${params.severity.toUpperCase()}: ${params.description}`, {
      type: params.type,
      userId: params.userId,
      ipAddress: params.ipAddress
    });

    return incident;
  }

  // Get security incidents with filtering
  async getSecurityIncidents(filters?: {
    severity?: string;
    type?: string;
    status?: string;
    userId?: number;
    limit?: number;
    offset?: number;
  }): Promise<{
    incidents: SecurityIncident[];
    total: number;
  }> {
    let filtered = [...this.incidents];

    if (filters?.severity) {
      filtered = filtered.filter(i => i.severity === filters.severity);
    }
    if (filters?.type) {
      filtered = filtered.filter(i => i.type === filters.type);
    }
    if (filters?.status) {
      filtered = filtered.filter(i => i.status === filters.status);
    }
    if (filters?.userId) {
      filtered = filtered.filter(i => i.userId === filters.userId);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filtered.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    
    const incidents = filtered.slice(offset, offset + limit);

    return { incidents, total };
  }

  // Get security dashboard statistics
  async getSecurityDashboard(): Promise<{
    openIncidents: number;
    criticalIncidents: number;
    incidentsLast24h: number;
    blockedIPs: number;
    incidentsByType: Record<string, number>;
    incidentTrends: Array<{ date: string; count: number; critical: number }>;
  }> {
    const openIncidents = this.incidents.filter(i => i.status === 'open').length;
    const criticalIncidents = this.incidents.filter(i => i.severity === 'critical').length;
    
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const incidentsLast24h = this.incidents.filter(i => i.timestamp > last24h).length;
    
    const blockedIPs = Array.from(this.loginAttempts.values()).filter(a => a.blocked).length;

    const incidentsByType = this.incidents.reduce((acc, incident) => {
      acc[incident.type] = (acc[incident.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group incidents by day for trend analysis
    const incidentTrends = this.incidents.reduce((acc, incident) => {
      const date = incident.timestamp.toISOString().split('T')[0];
      const existing = acc.find(item => item.date === date);
      
      if (existing) {
        existing.count += 1;
        if (incident.severity === 'critical') existing.critical += 1;
      } else {
        acc.push({
          date,
          count: 1,
          critical: incident.severity === 'critical' ? 1 : 0
        });
      }
      
      return acc;
    }, [] as Array<{ date: string; count: number; critical: number }>);

    return {
      openIncidents,
      criticalIncidents,
      incidentsLast24h,
      blockedIPs,
      incidentsByType,
      incidentTrends: incidentTrends.sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  // Resolve security incident
  async resolveIncident(incidentId: number, adminId: number, notes?: string): Promise<boolean> {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return false;

    incident.status = 'resolved';
    incident.assignedTo = adminId;
    incident.resolvedAt = new Date();
    incident.notes = notes;

    // Log incident resolution
    await auditService.logFinancialTransaction({
      userId: adminId,
      action: 'security_incident_resolved',
      entityType: 'user',
      entityId: incident.userId || 0,
      metadata: {
        incidentId,
        resolvedBy: adminId,
        notes: notes,
        originalSeverity: incident.severity
      }
    });

    console.log(`[SECURITY] Incident ${incidentId} resolved by admin ${adminId}`);
    return true;
  }
}

export const securityMonitor = SecurityMonitor.getInstance();