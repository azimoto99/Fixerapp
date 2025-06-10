import { db } from './db';
import { sql } from 'drizzle-orm';
import { auditLogs } from '@shared/schema';

interface AuditLogEntry {
  adminId: number | null;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  details?: any;
  success: boolean;
  timestamp?: Date;
  ipAddress?: string;
  userAgent?: string;
}

class AuditService {
  async logAdminAction(entry: AuditLogEntry) {
    try {
      // For now, we'll log to console and store in memory
      // In production, this should go to a dedicated audit table
      const auditEntry = {
        ...entry,
        timestamp: entry.timestamp || new Date(),
        id: Date.now() + Math.random()
      };

      console.log('[AUDIT]', JSON.stringify(auditEntry, null, 2));

      // Store in database audit table
      try {
        // Check if database connection is available
        if (!db) {
          console.log('[AUDIT] Database not available, using console only');
          return auditEntry;
        }

        await db.insert(auditLogs).values({
          adminId: entry.adminId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId?.toString() || null,
          details: entry.details || {},
          success: entry.success,
          ipAddress: entry.ipAddress || null,
          userAgent: entry.userAgent || null,
          createdAt: new Date()
        });
        console.log('[AUDIT] Successfully logged to database');
      } catch (dbError) {
        // If audit logging fails, don't break the application flow
        console.log('[AUDIT] Database logging failed, using console only:', dbError);
      }

      return auditEntry;
    } catch (error) {
      console.error('Audit logging error:', error);
      // Always return something to prevent null reference errors
      return {
        ...entry,
        timestamp: entry.timestamp || new Date(),
        id: Date.now() + Math.random()
      };
    }
  }

  async getAuditLogs(filters?: {
    adminId?: number;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    try {
      if (!db) {
        console.log('[AUDIT] Database not available for audit logs');
        return [];
      }

      // Use simple select with Drizzle ORM
      const result = await db.select().from(auditLogs)
        .orderBy(sql`created_at DESC`)
        .limit(filters?.limit || 100);

      return result || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }

  async logFinancialTransaction(entry: {
    userId: number;
    action: string;
    entityType: string;
    entityId: number | string;
    amount?: number;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }) {
    // Map financial transaction to admin action format
    return this.logAdminAction({
      adminId: entry.userId,
      action: entry.action,
      resourceType: entry.entityType,
      resourceId: entry.entityId,
      details: {
        amount: entry.amount,
        ...entry.metadata
      },
      success: true,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent
    });
  }

  async getAllAuditEntries(limit: number = 100, offset: number = 0) {
    try {
      if (!db) {
        console.log('[AUDIT] Database not available for audit entries');
        return [];
      }

      const result = await db.select().from(auditLogs)
        .orderBy(sql`created_at DESC`)
        .limit(limit)
        .offset(offset);

      return result || [];
    } catch (error) {
      console.error('Error getting audit entries:', error);
      return [];
    }
  }

  async getAdminActionSummary(adminId: number, days: number = 30) {
    try {
      if (!db) {
        console.log('[AUDIT] Database not available for admin action summary');
        return [];
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db.execute(sql`
        SELECT
          action,
          COUNT(*) as count,
          COUNT(CASE WHEN success = true THEN 1 END) as successful,
          COUNT(CASE WHEN success = false THEN 1 END) as failed
        FROM audit_logs
        WHERE admin_id = ${adminId}
        AND created_at >= ${startDate.toISOString()}
        GROUP BY action
        ORDER BY count DESC
      `);

      return result.rows || [];
    } catch (error) {
      console.error('Error getting admin action summary:', error);
      return [];
    }
  }
}

export const auditService = new AuditService();