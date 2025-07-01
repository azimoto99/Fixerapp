import Stripe from 'stripe';
import { storage } from './storage';
import { auditService } from './audit-service';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

// Refund Management Service for Plan Bravo Financial Management
export interface RefundRequest {
  id: number;
  jobId: number;
  requesterId: number;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'processed';
  adminNotes?: string;
  createdAt: Date;
  processedAt?: Date;
  processedBy?: number;
  stripeRefundId?: string;
}

export class RefundService {
  private static instance: RefundService;
  private refundRequests: RefundRequest[] = [];
  private currentId = 1;

  public static getInstance(): RefundService {
    if (!RefundService.instance) {
      RefundService.instance = new RefundService();
    }
    return RefundService.instance;
  }

  // Create refund request
  async createRefundRequest(params: {
    jobId: number;
    requesterId: number;
    amount: number;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<RefundRequest> {
    const refundRequest: RefundRequest = {
      id: this.currentId++,
      jobId: params.jobId,
      requesterId: params.requesterId,
      amount: params.amount,
      reason: params.reason,
      status: 'pending',
      createdAt: new Date()
    };

    this.refundRequests.push(refundRequest);

    // Log refund request in audit trail
    await auditService.logFinancialTransaction({
      userId: params.requesterId,
      action: 'refund_requested',
      entityType: 'refund',
      entityId: refundRequest.id,
      amount: params.amount,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        jobId: params.jobId,
        reason: params.reason,
        status: 'pending'
      }
    });

    console.log(`[REFUND] Request created: ${refundRequest.id} for job ${params.jobId} - $${params.amount}`);
    return refundRequest;
  }

  // Process refund request (admin action)
  async processRefundRequest(params: {
    refundId: number;
    adminId: number;
    decision: 'approved' | 'denied';
    adminNotes?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; message: string; stripeRefundId?: string }> {
    const refundRequest = this.refundRequests.find(r => r.id === params.refundId);
    
    if (!refundRequest) {
      return { success: false, message: 'Refund request not found' };
    }

    if (refundRequest.status !== 'pending') {
      return { success: false, message: 'Refund request already processed' };
    }

    refundRequest.status = params.decision;
    refundRequest.processedAt = new Date();
    refundRequest.processedBy = params.adminId;
    refundRequest.adminNotes = params.adminNotes;

    // If approved, process actual Stripe refund
    if (params.decision === 'approved') {
      try {
        const job = await storage.getJob(refundRequest.jobId);
        if (!job) {
          return { success: false, message: 'Associated job not found' };
        }

        const payment = await storage.getPaymentByJobId(refundRequest.jobId);
        if (!payment || !payment.transactionId) {
          return { success: false, message: 'Payment transaction not found' };
        }

        // Process Stripe refund
        const stripeRefund = await stripe.refunds.create({
          payment_intent: payment.transactionId,
          amount: Math.round(refundRequest.amount * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            jobId: refundRequest.jobId.toString(),
            refundRequestId: refundRequest.id.toString(),
            adminId: params.adminId.toString()
          }
        });

        refundRequest.stripeRefundId = stripeRefund.id;
        refundRequest.status = 'processed';

        // Update payment status
        await storage.updatePaymentStatus(payment.id, 'refunded', payment.transactionId);

        // Log successful refund processing
        await auditService.logFinancialTransaction({
          userId: params.adminId,
          action: 'refund_processed',
          entityType: 'refund',
          entityId: refundRequest.id,
          amount: refundRequest.amount,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: {
            jobId: refundRequest.jobId,
            decision: params.decision,
            stripeRefundId: stripeRefund.id,
            adminNotes: params.adminNotes
          }
        });

        console.log(`[REFUND] Processed successfully: ${refundRequest.id} - Stripe ID: ${stripeRefund.id}`);
        return { 
          success: true, 
          message: 'Refund processed successfully',
          stripeRefundId: stripeRefund.id
        };

      } catch (error) {
        console.error('Stripe refund error:', error);
        refundRequest.status = 'pending'; // Reset status on error
        
        return { 
          success: false, 
          message: `Stripe refund failed: ${(error as Error).message}` 
        };
      }
    } else {
      // Log denied refund
      await auditService.logFinancialTransaction({
        userId: params.adminId,
        action: 'refund_denied',
        entityType: 'refund',
        entityId: refundRequest.id,
        amount: refundRequest.amount,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: {
          jobId: refundRequest.jobId,
          decision: params.decision,
          adminNotes: params.adminNotes
        }
      });

      console.log(`[REFUND] Denied: ${refundRequest.id} - Reason: ${params.adminNotes}`);
      return { success: true, message: 'Refund request denied' };
    }
  }

  // Get refund requests with filtering
  async getRefundRequests(filters?: {
    status?: string;
    jobId?: number;
    requesterId?: number;
    limit?: number;
    offset?: number;
  }): Promise<{
    requests: RefundRequest[];
    total: number;
  }> {
    let filtered = [...this.refundRequests];

    if (filters?.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    if (filters?.jobId) {
      filtered = filtered.filter(r => r.jobId === filters.jobId);
    }
    if (filters?.requesterId) {
      filtered = filtered.filter(r => r.requesterId === filters.requesterId);
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = filtered.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    
    const requests = filtered.slice(offset, offset + limit);

    return { requests, total };
  }

  // Get refund statistics for admin dashboard
  async getRefundStatistics(): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    deniedRequests: number;
    totalRefundedAmount: number;
    averageRefundAmount: number;
    refundsByMonth: Array<{ month: string; count: number; amount: number }>;
  }> {
    const totalRequests = this.refundRequests.length;
    const pendingRequests = this.refundRequests.filter(r => r.status === 'pending').length;
    const approvedRequests = this.refundRequests.filter(r => r.status === 'approved' || r.status === 'processed').length;
    const deniedRequests = this.refundRequests.filter(r => r.status === 'denied').length;

    const processedRefunds = this.refundRequests.filter(r => r.status === 'processed');
    const totalRefundedAmount = processedRefunds.reduce((sum, r) => sum + r.amount, 0);
    const averageRefundAmount = processedRefunds.length > 0 ? totalRefundedAmount / processedRefunds.length : 0;

    // Group refunds by month
    const refundsByMonth = processedRefunds.reduce((acc, refund) => {
      const month = refund.processedAt?.toISOString().slice(0, 7) || 'unknown';
      const existing = acc.find(item => item.month === month);
      
      if (existing) {
        existing.count += 1;
        existing.amount += refund.amount;
      } else {
        acc.push({
          month,
          count: 1,
          amount: refund.amount
        });
      }
      
      return acc;
    }, [] as Array<{ month: string; count: number; amount: number }>);

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      deniedRequests,
      totalRefundedAmount,
      averageRefundAmount,
      refundsByMonth: refundsByMonth.sort((a, b) => a.month.localeCompare(b.month))
    };
  }

  // Check refund eligibility for a job
  async checkRefundEligibility(jobId: number): Promise<{
    eligible: boolean;
    reason: string;
    maxRefundAmount?: number;
  }> {
    try {
      const job = await storage.getJob(jobId);
      if (!job) {
        return { eligible: false, reason: 'Job not found' };
      }

      // Check if job is in a refundable state
      if (job.status === 'completed') {
        const completionTime = new Date(); // Would need actual completion timestamp
        const hoursSinceCompletion = (Date.now() - completionTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceCompletion > 72) { // 72-hour refund window
          return { eligible: false, reason: 'Refund window has expired (72 hours after completion)' };
        }
      }

      if (job.status === 'canceled') {
        return { eligible: false, reason: 'Job has already been canceled' };
      }

      // Check for existing refund requests
      const existingRefund = this.refundRequests.find(r => 
        r.jobId === jobId && (r.status === 'pending' || r.status === 'processed')
      );
      
      if (existingRefund) {
        return { eligible: false, reason: 'Refund already requested or processed for this job' };
      }

      const payment = await storage.getPaymentByJobId(jobId);
      if (!payment) {
        return { eligible: false, reason: 'No payment found for this job' };
      }

      if (payment.status === 'refunded') {
        return { eligible: false, reason: 'Payment has already been refunded' };
      }

      return {
        eligible: true,
        reason: 'Job is eligible for refund',
        maxRefundAmount: job.totalAmount
      };

    } catch (error) {
      console.error('Error checking refund eligibility:', error);
      return { eligible: false, reason: 'Error checking eligibility' };
    }
  }
}

export const refundService = RefundService.getInstance();