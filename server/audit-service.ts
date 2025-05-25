import { db } from './db';
import { sql } from 'drizzle-orm';

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
      
      // Store in database audit table (if it exists)
      try {
        await db.execute(sql`
          INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, success, created_at, ip_address, user_agent)
          VALUES (${entry.adminId}, ${entry.action}, ${entry.resourceType}, ${entry.resourceId}, ${JSON.stringify(entry.details)}, ${entry.success}, ${new Date()}, ${entry.ipAddress || ''}, ${entry.userAgent || ''})
        `);
      } catch (dbError) {
        // If audit table doesn't exist, just log to console
        console.log('[AUDIT] Database logging failed, using console only:', dbError);
      }

      return auditEntry;
    } catch (error) {
      console.error('Audit logging error:', error);
      return null;
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
      // Return audit logs from database if available
      let query = `
        SELECT * FROM audit_logs 
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (filters?.adminId) {
        query += ` AND admin_id = $${params.length + 1}`;
        params.push(filters.adminId);
      }
      
      if (filters?.action) {
        query += ` AND action = $${params.length + 1}`;
        params.push(filters.action);
      }
      
      if (filters?.resourceType) {
        query += ` AND resource_type = $${params.length + 1}`;
        params.push(filters.resourceType);
      }
      
      if (filters?.startDate) {
        query += ` AND created_at >= $${params.length + 1}`;
        params.push(filters.startDate);
      }
      
      if (filters?.endDate) {
        query += ` AND created_at <= $${params.length + 1}`;
        params.push(filters.endDate);
      }
      
      query += ` ORDER BY created_at DESC`;
      
      if (filters?.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      }
      
      const result = await db.execute(sql.raw(query, params));
      return result.rows || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }

  async getAdminActionSummary(adminId: number, days: number = 30) {
    try {
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
        AND created_at >= ${startDate}
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