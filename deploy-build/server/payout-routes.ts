/**
 * Payout routes for handling worker payments
 */

import { Router, Request, Response } from 'express';
import { 
  processWorkerPayout, 
  processAllPendingPayoutsForWorker,
  processAllPendingPayouts 
} from './payout-handler';

// Create a router
const payoutRouter = Router();

// Authentication middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized - Please login again" });
  }
  
  next();
}

// Admin middleware - for now, only specific users are admins
function isAdmin(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized - Please login again" });
  }
  
  // In a real app, we'd check for an admin role
  // For now, only specific users have admin access
  if (req.user.username === 'Azi' || req.user.id === 9 || req.user.id === 1) {
    return next();
  }
  
  return res.status(403).json({ message: "Forbidden - Admin access required" });
}

// Worker payout endpoints
payoutRouter.post("/worker-payout/:earningId", isAdmin, async (req: Request, res: Response) => {
  try {
    const earningId = parseInt(req.params.earningId);
    
    if (isNaN(earningId)) {
      return res.status(400).json({ message: "Invalid earning ID" });
    }
    
    const result = await processWorkerPayout(earningId);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    
    res.json(result);
  } catch (error: any) {
    console.error("Error processing worker payout:", error);
    res.status(500).json({ message: error.message });
  }
});

// Process all pending payouts for a worker
payoutRouter.post("/worker/:workerId/process-payouts", isAdmin, async (req: Request, res: Response) => {
  try {
    const workerId = parseInt(req.params.workerId);
    
    if (isNaN(workerId)) {
      return res.status(400).json({ message: "Invalid worker ID" });
    }
    
    const result = await processAllPendingPayoutsForWorker(workerId);
    
    res.json(result);
  } catch (error: any) {
    console.error("Error processing worker payouts:", error);
    res.status(500).json({ message: error.message });
  }
});

// Process all pending payouts across the platform (admin only)
payoutRouter.post("/process-all-payouts", isAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await processAllPendingPayouts();
    
    res.json(result);
  } catch (error: any) {
    console.error("Error processing all payouts:", error);
    res.status(500).json({ message: error.message });
  }
});

// Workers can request their own pending payouts
payoutRouter.post("/request-payout", isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Ensure the user is a worker
    if (req.user?.accountType !== 'worker') {
      return res.status(403).json({ 
        message: "Only workers can request payouts" 
      });
    }
    
    const workerId = req.user.id;
    
    // Process all pending payouts for this worker
    const result = await processAllPendingPayoutsForWorker(workerId);
    
    // If no successful payouts, check if there were pending earnings at all
    if (result.successfulPayouts === 0) {
      if (result.totalProcessed === 0) {
        return res.status(404).json({ 
          message: "No pending earnings found to process" 
        });
      }
    }
    
    res.json(result);
  } catch (error: any) {
    console.error("Error requesting payout:", error);
    res.status(500).json({ message: error.message });
  }
});

export default payoutRouter;