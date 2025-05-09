/**
 * Worker Payout Handler
 * Processes payouts for worker earnings using Stripe Connect transfers
 */

import { storage } from "./storage";
import Stripe from "stripe";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Define Earning type based on database schema
export type Earning = {
  id: number;
  workerId: number;
  jobId: number;
  amount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  transferId: string | null;
  description: string | null;
};

/**
 * Process a payout for a worker earning
 * @param earningId The ID of the earning to process
 * @returns Result object with success status and details
 */
export async function processWorkerPayout(earningId: number): Promise<{
  success: boolean;
  message: string;
  transferId?: string;
  amount?: number;
}> {
  try {
    // 1. Get the earning record
    const earning = await storage.getEarningById(earningId);
    
    if (!earning) {
      return {
        success: false,
        message: `Earning record #${earningId} not found`
      };
    }
    
    // 2. Check if earning is already processed
    if (earning.status === 'paid' || earning.transferId) {
      return {
        success: false,
        message: `Earning #${earningId} has already been processed`,
        transferId: earning.transferId || undefined,
        amount: earning.amount
      };
    }
    
    // 3. Check if the earning status allows for payout
    if (earning.status !== 'pending' && earning.status !== 'approved') {
      return {
        success: false,
        message: `Earning #${earningId} has status '${earning.status}' which is not eligible for payout`
      };
    }
    
    // 4. Get the worker details
    const worker = await storage.getUser(earning.workerId);
    
    if (!worker) {
      return {
        success: false,
        message: `Worker #${earning.workerId} not found`
      };
    }
    
    // 5. Check if worker has a Stripe Connect account
    if (!worker.stripeConnectAccountId) {
      return {
        success: false,
        message: `Worker #${earning.workerId} does not have a Stripe Connect account`
      };
    }
    
    // 6. Get the job details for better reference
    const job = await storage.getJobById(earning.jobId);
    
    const jobTitle = job ? job.title : `Job #${earning.jobId}`;
    const description = earning.description || `Payment for ${jobTitle}`;
    
    // 7. Check if the Connect account is in good standing with capability to receive transfers
    try {
      const account = await stripe.accounts.retrieve(worker.stripeConnectAccountId);
      
      // Check if transfers capability is enabled
      if (
        !account.capabilities?.transfers ||
        account.capabilities.transfers !== 'active'
      ) {
        return {
          success: false,
          message: `Worker Connect account cannot receive transfers. Current capabilities: ${JSON.stringify(account.capabilities)}`
        };
      }
      
      // 8. Create the transfer to the worker's Connect account
      const amountInCents = Math.round(earning.amount * 100);
      
      const transfer = await stripe.transfers.create({
        amount: amountInCents,
        currency: 'usd',
        destination: worker.stripeConnectAccountId,
        description: description,
        metadata: {
          earningId: earning.id.toString(),
          workerId: worker.id.toString(),
          jobId: earning.jobId.toString(),
          jobTitle: jobTitle
        }
      });
      
      // 9. Update the earning record with the transfer ID and status
      await storage.updateEarning(earning.id, {
        status: 'paid',
        transferId: transfer.id,
        updatedAt: new Date()
      });
      
      // 10. Create a notification for the worker
      await storage.createNotification({
        userId: worker.id,
        title: 'Payment Processed',
        message: `You've been paid $${earning.amount.toFixed(2)} for ${jobTitle}`,
        type: 'payment',
        isRead: false,
        sourceType: 'earning',
        sourceId: earning.id,
        metadata: {
          amount: earning.amount,
          transferId: transfer.id,
          jobTitle: jobTitle
        }
      });
      
      return {
        success: true,
        message: `Successfully processed payment of $${earning.amount.toFixed(2)} to worker #${worker.id}`,
        transferId: transfer.id,
        amount: earning.amount
      };
      
    } catch (error: any) {
      console.error('Error processing worker payout:', error);
      
      return {
        success: false,
        message: `Failed to process payout: ${error.message}`
      };
    }
  } catch (error: any) {
    console.error('Error in processWorkerPayout:', error);
    
    return {
      success: false,
      message: `Internal server error: ${error.message}`
    };
  }
}

/**
 * Process all pending payouts for a specific worker
 * @param workerId The ID of the worker
 * @returns Results of all payout attempts
 */
export async function processAllPendingPayoutsForWorker(workerId: number): Promise<{
  totalProcessed: number;
  successfulPayouts: number;
  failedPayouts: number;
  totalAmount: number;
  results: Array<{
    earningId: number;
    success: boolean;
    message: string;
    amount?: number;
  }>;
}> {
  try {
    // 1. Get all pending earnings for the worker
    const pendingEarnings = await storage.getEarningsByWorkerIdAndStatus(
      workerId,
      ['pending', 'approved']
    );
    
    // Initialize result
    const result = {
      totalProcessed: pendingEarnings.length,
      successfulPayouts: 0,
      failedPayouts: 0,
      totalAmount: 0,
      results: [] as Array<{
        earningId: number;
        success: boolean;
        message: string;
        amount?: number;
      }>
    };
    
    // 2. Process each earning
    for (const earning of pendingEarnings) {
      const payoutResult = await processWorkerPayout(earning.id);
      
      result.results.push({
        earningId: earning.id,
        success: payoutResult.success,
        message: payoutResult.message,
        amount: earning.amount
      });
      
      if (payoutResult.success) {
        result.successfulPayouts++;
        result.totalAmount += earning.amount;
      } else {
        result.failedPayouts++;
      }
    }
    
    return result;
  } catch (error: any) {
    console.error('Error processing all pending payouts for worker:', error);
    
    return {
      totalProcessed: 0,
      successfulPayouts: 0,
      failedPayouts: 0,
      totalAmount: 0,
      results: [{
        earningId: 0,
        success: false,
        message: `Internal server error: ${error.message}`
      }]
    };
  }
}

/**
 * Process all pending payouts across the platform
 * @returns Summary of processing results
 */
export async function processAllPendingPayouts(): Promise<{
  totalProcessed: number;
  successfulPayouts: number;
  failedPayouts: number;
  totalAmount: number;
  workerResults: Record<number, {
    workerId: number;
    successfulPayouts: number;
    failedPayouts: number;
    totalAmount: number;
  }>;
}> {
  try {
    // 1. Get all pending earnings
    const pendingEarnings = await getAllPendingEarnings();
    
    // Initialize result
    const result = {
      totalProcessed: pendingEarnings.length,
      successfulPayouts: 0,
      failedPayouts: 0,
      totalAmount: 0,
      workerResults: {} as Record<number, {
        workerId: number;
        successfulPayouts: number;
        failedPayouts: number;
        totalAmount: number;
      }>
    };
    
    // 2. Group earnings by worker
    const earningsByWorker: Record<number, Earning[]> = {};
    
    for (const earning of pendingEarnings) {
      if (!earningsByWorker[earning.workerId]) {
        earningsByWorker[earning.workerId] = [];
      }
      
      earningsByWorker[earning.workerId].push(earning);
    }
    
    // 3. Process earnings for each worker
    for (const [workerId, earnings] of Object.entries(earningsByWorker)) {
      const workerIdNum = parseInt(workerId);
      
      result.workerResults[workerIdNum] = {
        workerId: workerIdNum,
        successfulPayouts: 0,
        failedPayouts: 0,
        totalAmount: 0
      };
      
      for (const earning of earnings) {
        const payoutResult = await processWorkerPayout(earning.id);
        
        if (payoutResult.success) {
          result.successfulPayouts++;
          result.totalAmount += earning.amount;
          result.workerResults[workerIdNum].successfulPayouts++;
          result.workerResults[workerIdNum].totalAmount += earning.amount;
        } else {
          result.failedPayouts++;
          result.workerResults[workerIdNum].failedPayouts++;
        }
      }
    }
    
    return result;
    
  } catch (error: any) {
    console.error('Error processing all pending payouts:', error);
    
    return {
      totalProcessed: 0,
      successfulPayouts: 0,
      failedPayouts: 0,
      totalAmount: 0,
      workerResults: {}
    };
  }
}

/**
 * Get all pending and approved earnings across the platform
 * @returns Array of earnings
 */
async function getAllPendingEarnings(): Promise<Earning[]> {
  try {
    // Get earnings with status 'pending' or 'approved'
    const earnings = await storage.getAllEarningsByStatus(['pending', 'approved']);
    return earnings;
  } catch (error) {
    console.error('Error getting pending earnings:', error);
    return [];
  }
}