/**
 * Worker Payout Handler
 * Processes payouts for worker earnings using Stripe Connect transfers
 */

import Stripe from "stripe";
import { storage } from "./storage";
import { Earning } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required environment variable: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any,
});

/**
 * Process a payout for a worker earning
 * @param earningId The ID of the earning to process
 * @returns Result object with success status and details
 */
export async function processWorkerPayout(earningId: number): Promise<{
  success: boolean;
  message: string;
  transferId?: string;
}> {
  try {
    // 1. Get the earning record
    const earning = await storage.getEarning(earningId);
    if (!earning) {
      return { success: false, message: "Earning not found" };
    }
    
    // 2. Check if earning is already paid
    if (earning.status === 'paid') {
      return { success: false, message: "Earning already paid" };
    }
    
    // 3. Get the worker
    const worker = await storage.getUser(earning.workerId);
    if (!worker) {
      return { success: false, message: "Worker not found" };
    }
    
    // 4. Check if worker has a Connect account
    if (!worker.stripeConnectAccountId) {
      return { 
        success: false, 
        message: "Worker has no Stripe Connect account configured" 
      };
    }
    
    // 5. Get the job details
    const job = await storage.getJob(earning.jobId);
    if (!job) {
      return { success: false, message: "Job not found" };
    }
    
    // 6. Create a transfer to the worker's Connect account
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(earning.netAmount * 100), // Convert to cents
        currency: 'usd',
        destination: worker.stripeConnectAccountId,
        description: `Payment for job: ${job.title} (ID: ${job.id})`,
        metadata: {
          jobId: job.id.toString(),
          workerId: worker.id.toString(),
          earningId: earning.id.toString(),
          platform: 'GigConnect'
        }
      });
      
      // 7. Update earning status
      await storage.updateEarningStatus(earning.id, 'paid', new Date());
      
      // 8. Create notification for worker
      await storage.createNotification({
        userId: worker.id,
        title: 'Payment Received',
        message: `You've received $${earning.netAmount.toFixed(2)} for job: ${job.title}`,
        type: 'payment_received',
        sourceId: job.id,
        sourceType: 'job',
        metadata: {
          amount: earning.netAmount,
          transferId: transfer.id
        }
      });
      
      return { 
        success: true, 
        message: "Transfer successful", 
        transferId: transfer.id 
      };
    } catch (error: any) {
      console.error("Transfer error:", error.message);
      
      // Special handling for common Stripe transfer errors
      if (error.message.includes("capabilities")) {
        return { 
          success: false, 
          message: "Worker account missing required capabilities (transfers). Worker must complete Stripe onboarding." 
        };
      } else if (error.message.includes("insufficient funds")) {
        return { 
          success: false, 
          message: "Insufficient funds in platform account. In test mode, this error can be ignored." 
        };
      }
      
      return { 
        success: false, 
        message: `Transfer failed: ${error.message}` 
      };
    }
  } catch (error: any) {
    console.error("Payout processing error:", error);
    return { 
      success: false, 
      message: `Payout error: ${error.message}` 
    };
  }
}

/**
 * Process all pending payouts for a specific worker
 * @param workerId The ID of the worker
 * @returns Results of all payout attempts
 */
export async function processAllPendingPayoutsForWorker(workerId: number): Promise<{
  success: boolean;
  totalProcessed: number;
  successfulPayouts: number;
  failedPayouts: number;
  results: Array<{
    earningId: number;
    amount: number;
    success: boolean;
    message: string;
    transferId?: string;
  }>;
}> {
  try {
    // Get all pending earnings for the worker
    const earnings = await storage.getEarningsForWorker(workerId);
    const pendingEarnings = earnings.filter(e => e.status === 'pending');
    
    if (pendingEarnings.length === 0) {
      return {
        success: true,
        totalProcessed: 0,
        successfulPayouts: 0,
        failedPayouts: 0,
        results: []
      };
    }
    
    const results = [];
    let successCount = 0;
    
    for (const earning of pendingEarnings) {
      const result = await processWorkerPayout(earning.id);
      
      results.push({
        earningId: earning.id,
        amount: earning.netAmount,
        success: result.success,
        message: result.message,
        transferId: result.transferId
      });
      
      if (result.success) {
        successCount++;
      }
    }
    
    return {
      success: true,
      totalProcessed: pendingEarnings.length,
      successfulPayouts: successCount,
      failedPayouts: pendingEarnings.length - successCount,
      results
    };
  } catch (error: any) {
    console.error("Error processing all pending payouts:", error);
    return {
      success: false,
      totalProcessed: 0,
      successfulPayouts: 0,
      failedPayouts: 0,
      results: []
    };
  }
}

/**
 * Process all pending payouts across the platform
 * @returns Summary of processing results
 */
export async function processAllPendingPayouts(): Promise<{
  success: boolean;
  totalProcessed: number;
  successfulPayouts: number;
  failedPayouts: number;
}> {
  try {
    // Get all earnings with pending status
    const allEarnings = await getAllPendingEarnings();
    
    if (allEarnings.length === 0) {
      return {
        success: true,
        totalProcessed: 0,
        successfulPayouts: 0,
        failedPayouts: 0
      };
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const earning of allEarnings) {
      const result = await processWorkerPayout(earning.id);
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    return {
      success: true,
      totalProcessed: allEarnings.length,
      successfulPayouts: successCount,
      failedPayouts: failCount
    };
  } catch (error: any) {
    console.error("Error processing all pending payouts:", error);
    return {
      success: false,
      totalProcessed: 0,
      successfulPayouts: 0,
      failedPayouts: 0
    };
  }
}

// Helper function to get all pending earnings across the platform
async function getAllPendingEarnings(): Promise<Earning[]> {
  try {
    // In production, this should be optimized with a direct query
    // to get only pending earnings, but for now we'll filter in memory
    const allWorkers = await storage.getAllUsers();
    const workers = allWorkers.filter(u => u.accountType === 'worker');
    
    let pendingEarnings: Earning[] = [];
    
    for (const worker of workers) {
      const earnings = await storage.getEarningsForWorker(worker.id);
      const pending = earnings.filter(e => e.status === 'pending');
      pendingEarnings = [...pendingEarnings, ...pending];
    }
    
    return pendingEarnings;
  } catch (error) {
    console.error("Error getting pending earnings:", error);
    return [];
  }
}