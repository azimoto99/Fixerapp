import { storage } from './storage';
import Stripe from 'stripe';
import { db } from './db';
import { sql } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

interface FinancialMetrics {
  totalRevenue: number;
  platformFees: number;
  totalPayouts: number;
  pendingPayouts: number;
  successfulTransactions: number;
  failedTransactions: number;
  refundedAmount: number;
  disputedAmount: number;
  averageTransactionValue: number;
}

interface TransactionFilter {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  type?: string;
  userId?: number;
  jobId?: number;
  limit?: number;
  offset?: number;
}

class FinancialService {
  async getFinancialMetrics(startDate?: Date, endDate?: Date): Promise<FinancialMetrics> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate || new Date();

      // Get payments data for the period
      const payments = await storage.getAllPayments();
      const earnings = await storage.getAllEarnings();

      // Filter by date range
      const filteredPayments = payments.filter(p => {
        const paymentDate = p.createdAt || new Date();
        return paymentDate >= start && paymentDate <= end;
      });

      const filteredEarnings = earnings.filter(e => {
        const earningDate = e.dateEarned || new Date();
        return earningDate >= start && earningDate <= end;
      });

      // Calculate metrics
      const totalRevenue = filteredPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const platformFees = filteredPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.serviceFee || 0), 0);

      const totalPayouts = filteredEarnings
        .filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + (e.netAmount || 0), 0);

      const pendingPayouts = filteredEarnings
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + (e.netAmount || 0), 0);

      const successfulTransactions = filteredPayments.filter(p => p.status === 'completed').length;
      const failedTransactions = filteredPayments.filter(p => p.status === 'failed').length;

      const refundedAmount = filteredPayments
        .filter(p => p.status === 'refunded')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const disputedAmount = filteredPayments
        .filter(p => p.status === 'disputed')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const averageTransactionValue = successfulTransactions > 0 
        ? totalRevenue / successfulTransactions 
        : 0;

      return {
        totalRevenue,
        platformFees,
        totalPayouts,
        pendingPayouts,
        successfulTransactions,
        failedTransactions,
        refundedAmount,
        disputedAmount,
        averageTransactionValue
      };
    } catch (error) {
      console.error('Error calculating financial metrics:', error);
      throw error;
    }
  }

  async getTransactionHistory(filters: TransactionFilter = {}) {
    try {
      const payments = await storage.getAllPayments();
      const earnings = await storage.getAllEarnings();

      // Combine payments and earnings into unified transaction history
      const transactions = [
        ...payments.map(p => ({
          id: p.id,
          type: 'payment',
          amount: p.amount || 0,
          status: p.status,
          description: p.description,
          userId: p.userId,
          jobId: p.jobId,
          createdAt: p.createdAt,
          stripeTransactionId: p.transactionId,
          serviceFee: p.serviceFee || 0
        })),
        ...earnings.map(e => ({
          id: e.id,
          type: 'earning',
          amount: e.amount || 0,
          status: e.status,
          description: e.description,
          userId: e.workerId,
          jobId: e.jobId,
          createdAt: e.dateEarned,
          stripeTransactionId: e.transactionId,
          serviceFee: e.serviceFee || 0
        }))
      ];

      // Apply filters
      let filteredTransactions = transactions;

      if (filters.startDate) {
        filteredTransactions = filteredTransactions.filter(t => 
          t.createdAt && t.createdAt >= filters.startDate!
        );
      }

      if (filters.endDate) {
        filteredTransactions = filteredTransactions.filter(t => 
          t.createdAt && t.createdAt <= filters.endDate!
        );
      }

      if (filters.status) {
        filteredTransactions = filteredTransactions.filter(t => t.status === filters.status);
      }

      if (filters.type) {
        filteredTransactions = filteredTransactions.filter(t => t.type === filters.type);
      }

      if (filters.userId) {
        filteredTransactions = filteredTransactions.filter(t => t.userId === filters.userId);
      }

      if (filters.jobId) {
        filteredTransactions = filteredTransactions.filter(t => t.jobId === filters.jobId);
      }

      // Sort by creation date (newest first)
      filteredTransactions.sort((a, b) => {
        const dateA = a.createdAt || new Date(0);
        const dateB = b.createdAt || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

      return {
        transactions: paginatedTransactions,
        total: filteredTransactions.length,
        hasMore: offset + limit < filteredTransactions.length
      };
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  async processRefund(paymentId: number, amount?: number, reason?: string) {
    try {
      const payment = await storage.getPayment(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (!payment.transactionId) {
        throw new Error('No Stripe transaction ID found for this payment');
      }

      // Process refund through Stripe
      const refund = await stripe.refunds.create({
        payment_intent: payment.transactionId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
        reason: reason as any || 'requested_by_customer'
      });

      // Update payment status in database
      await storage.updatePaymentStatus(paymentId, 'refunded', refund.id);

      return {
        success: true,
        refund,
        message: 'Refund processed successfully'
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      throw error;
    }
  }

  async processPayout(earningId: number) {
    try {
      const earning = await storage.getEarning(earningId);
      if (!earning) {
        throw new Error('Earning not found');
      }

      if (earning.status === 'paid') {
        throw new Error('Earning already paid out');
      }

      // Get user's Stripe Connect account
      const user = await storage.getUser(earning.workerId);
      if (!user?.stripeConnectAccountId) {
        throw new Error('Worker does not have a connected Stripe account');
      }

      // Create transfer to connected account
      const transfer = await stripe.transfers.create({
        amount: Math.round(earning.netAmount * 100), // Convert to cents
        currency: 'usd',
        destination: user.stripeConnectAccountId,
        transfer_group: `earning_${earning.id}`
      });

      // Update earning status
      await storage.updateEarningStatus(earningId, 'paid', new Date());

      return {
        success: true,
        transfer,
        message: 'Payout processed successfully'
      };
    } catch (error) {
      console.error('Payout processing error:', error);
      throw error;
    }
  }

  async getStripeTransactionDetails(transactionId: string) {
    try {
      // Fetch payment intent details from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);
      
      // Fetch related charges
      const charges = await stripe.charges.list({
        payment_intent: transactionId
      });

      return {
        paymentIntent,
        charges: charges.data,
        fees: charges.data.reduce((sum, charge) => sum + (charge.application_fee_amount || 0), 0)
      };
    } catch (error) {
      console.error('Error fetching Stripe transaction details:', error);
      throw error;
    }
  }

  async reconcileData(startDate: Date, endDate: Date) {
    try {
      // Get local data
      const localPayments = await storage.getAllPayments();
      const filteredLocal = localPayments.filter(p => {
        const date = p.createdAt;
        return date && date >= startDate && date <= endDate;
      });

      // Get Stripe data
      const stripePayments = await stripe.paymentIntents.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000)
        },
        limit: 100
      });

      // Find discrepancies
      const discrepancies = [];
      
      for (const stripePayment of stripePayments.data) {
        const localPayment = filteredLocal.find(p => p.transactionId === stripePayment.id);
        
        if (!localPayment) {
          discrepancies.push({
            type: 'missing_local',
            stripeId: stripePayment.id,
            amount: stripePayment.amount / 100,
            status: stripePayment.status
          });
        } else if (Math.abs((localPayment.amount || 0) - (stripePayment.amount / 100)) > 0.01) {
          discrepancies.push({
            type: 'amount_mismatch',
            localId: localPayment.id,
            stripeId: stripePayment.id,
            localAmount: localPayment.amount,
            stripeAmount: stripePayment.amount / 100
          });
        }
      }

      return {
        localCount: filteredLocal.length,
        stripeCount: stripePayments.data.length,
        discrepancies,
        lastReconciled: new Date()
      };
    } catch (error) {
      console.error('Error reconciling data:', error);
      throw error;
    }
  }
}

export const financialService = new FinancialService();