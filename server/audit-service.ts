import { storage } from './storage';

// Financial Audit Trail Service for Plan Bravo Implementation
export interface AuditEntry {
  id: number;
  timestamp: Date;
  userId: number;
  action: string;
  entityType: 'payment' | 'earning' | 'job' | 'user' | 'refund';
  entityId: number;
  previousValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  amount?: number;
  status: string;
  metadata: any;
}

export class AuditService {
  private static instance: AuditService;
  private auditLog: AuditEntry[] = [];
  private currentId = 1;

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  // Log financial transaction for audit trail
  async logFinancialTransaction(params: {
    userId: number;
    action: string;
    entityType: 'payment' | 'earning' | 'job' | 'refund';
    entityId: number;
    amount?: number;
    previousValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    const auditEntry: AuditEntry = {
      id: this.currentId++,
      timestamp: new Date(),
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      previousValues: params.previousValues,
      newValues: params.newValues,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      amount: params.amount,
      status: 'recorded',
      metadata: {
        ...params.metadata,
        platformFee: this.calculatePlatformFee(params.amount || 0),
        timestamp: new Date().toISOString()
      }
    };

    this.auditLog.push(auditEntry);
    
    console.log(`[AUDIT] ${auditEntry.action} - ${auditEntry.entityType} ${auditEntry.entityId} by user ${auditEntry.userId}`, {
      amount: auditEntry.amount,
      metadata: auditEntry.metadata
    });
  }

  // Calculate platform fee based on Plan Bravo requirements
  private calculatePlatformFee(amount: number): number {
    if (amount >= 20) {
      return amount * 0.10; // 10% fee on jobs $20+
    } else if (amount >= 10) {
      return 3; // $3 service fee on jobs $10-$19.99
    }
    return 0;
  }

  // Get audit trail for specific entity
  async getAuditTrail(entityType: string, entityId: number): Promise<AuditEntry[]> {
    return this.auditLog.filter(entry => 
      entry.entityType === entityType && entry.entityId === entityId
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get financial audit summary
  async getFinancialAuditSummary(startDate?: Date, endDate?: Date): Promise<{
    totalTransactions: number;
    totalRevenue: number;
    totalFees: number;
    transactionsByType: Record<string, number>;
    revenueByDay: Array<{ date: string; revenue: number; fees: number }>;
  }> {
    const filtered = this.auditLog.filter(entry => {
      if (!startDate && !endDate) return true;
      const entryDate = entry.timestamp;
      return (!startDate || entryDate >= startDate) && (!endDate || entryDate <= endDate);
    });

    const totalTransactions = filtered.length;
    const totalRevenue = filtered.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const totalFees = filtered.reduce((sum, entry) => sum + (entry.metadata?.platformFee || 0), 0);

    const transactionsByType = filtered.reduce((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by day for revenue tracking
    const revenueByDay = filtered.reduce((acc, entry) => {
      const date = entry.timestamp.toISOString().split('T')[0];
      const existing = acc.find(item => item.date === date);
      
      if (existing) {
        existing.revenue += entry.amount || 0;
        existing.fees += entry.metadata?.platformFee || 0;
      } else {
        acc.push({
          date,
          revenue: entry.amount || 0,
          fees: entry.metadata?.platformFee || 0
        });
      }
      
      return acc;
    }, [] as Array<{ date: string; revenue: number; fees: number }>);

    return {
      totalTransactions,
      totalRevenue,
      totalFees,
      transactionsByType,
      revenueByDay: revenueByDay.sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  // Get all audit entries for admin review
  async getAllAuditEntries(limit: number = 100, offset: number = 0): Promise<{
    entries: AuditEntry[];
    total: number;
  }> {
    const sortedEntries = this.auditLog.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return {
      entries: sortedEntries.slice(offset, offset + limit),
      total: this.auditLog.length
    };
  }

  // Validate financial data integrity
  async validateFinancialIntegrity(): Promise<{
    isValid: boolean;
    discrepancies: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  }> {
    const discrepancies = [];
    
    // Check for duplicate transactions
    const transactionHashes = new Set();
    for (const entry of this.auditLog) {
      const hash = `${entry.entityType}-${entry.entityId}-${entry.amount}-${entry.timestamp.getTime()}`;
      if (transactionHashes.has(hash)) {
        discrepancies.push({
          type: 'duplicate_transaction',
          description: `Potential duplicate transaction detected for ${entry.entityType} ${entry.entityId}`,
          severity: 'high' as const
        });
      }
      transactionHashes.add(hash);
    }

    // Check for unusual amounts
    const averageAmount = this.auditLog.reduce((sum, entry) => sum + (entry.amount || 0), 0) / this.auditLog.length;
    for (const entry of this.auditLog) {
      if (entry.amount && entry.amount > averageAmount * 10) {
        discrepancies.push({
          type: 'unusual_amount',
          description: `Unusually high transaction amount: $${entry.amount} for ${entry.entityType} ${entry.entityId}`,
          severity: 'medium' as const
        });
      }
    }

    return {
      isValid: discrepancies.length === 0,
      discrepancies
    };
  }

  // Export audit data for compliance
  async exportAuditData(format: 'json' | 'csv' = 'json'): Promise<string> {
    if (format === 'csv') {
      const headers = ['ID', 'Timestamp', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'Amount', 'Status', 'IP Address'];
      const rows = this.auditLog.map(entry => [
        entry.id,
        entry.timestamp.toISOString(),
        entry.userId,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.amount || 0,
        entry.status,
        entry.ipAddress || 'unknown'
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(this.auditLog, null, 2);
  }
}

export const auditService = AuditService.getInstance();