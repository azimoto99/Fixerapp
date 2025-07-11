import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../auth-helpers';
import { z } from 'zod';
import { 
  createPayPalOrder, 
  capturePayPalOrder, 
  getPayPalOrder,
  createPayPalPayout,
  refundPayPalPayment,
  processMarketplacePayment
} from '../paypal-integration';

const router = express.Router();

// Authentication middleware - matches the pattern from main routes
function isAuthenticated(req: Request, res: Response, next: any) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

// GET /api/payments - Get user's payment history
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const payments = await storage.getPaymentsByUserId(req.user.id);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ 
      message: 'Failed to fetch payments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/payments/user/:userId - Get payments for specific user (with authorization check)
router.get('/user/:userId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Only allow users to view their own payments unless they're admin
    if (req.user!.id !== userId && !req.user!.isAdmin) {
      return res.status(403).json({ message: 'Access denied: You can only view your own payments' });
    }

    const payments = await storage.getPaymentsByUserId(userId);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching user payments:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user payments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/payments/job/:jobId - Get payment by job ID
router.get('/job/:jobId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    
    if (isNaN(jobId)) {
      return res.status(400).json({ message: 'Invalid job ID' });
    }

    const payment = await storage.getPaymentByJobId(jobId);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found for this job' });
    }

    // Only allow users to view their own payments unless they're admin
    if (payment.userId !== req.user!.id && payment.workerId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ message: 'Access denied: You can only view your own payments' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment by job ID:', error);
    res.status(500).json({ 
      message: 'Failed to fetch payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/payments/:paymentId - Get specific payment details
router.get('/:paymentId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    
    if (isNaN(paymentId)) {
      return res.status(400).json({ message: 'Invalid payment ID' });
    }

    const payment = await storage.getPayment(paymentId);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Only allow users to view their own payments unless they're admin
    if (payment.userId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ message: 'Access denied: You can only view your own payments' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ 
      message: 'Failed to fetch payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/payments/process - Process a payment
router.post('/process', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Validate request body
    const schema = z.object({
      amount: z.number().positive('Amount must be positive'),
      paymentMethodId: z.string().min(1, 'Payment method ID is required'),
      jobId: z.number().optional(),
      workerId: z.number().optional(),
      applicationId: z.number().optional(),
      description: z.string().optional()
    });

    const validatedData = schema.parse(req.body);

    // Import and use the existing payment processing logic
    const { processPayment } = await import('../api/process-payment');
    
    // Forward the request to the existing payment processor
    req.body = validatedData;
    await processPayment(req, res);

  } catch (error) {
    console.error('Error processing payment:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid payment data',
        errors: error.errors
      });
    }

    res.status(500).json({ 
      message: 'Failed to process payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/payments/withdraw - Handle withdrawal requests
router.post('/withdraw', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Validate request body
    const schema = z.object({
      amount: z.number().positive('Amount must be positive'),
      destinationAccountId: z.string().optional(),
      method: z.enum(['bank_transfer', 'paypal']).default('paypal')
    });

    const { amount, destinationAccountId, method } = schema.parse(req.body);

    // Get user to check if they have PayPal account
    const user = await storage.getUser(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (method === 'paypal' && !user.email) {
      return res.status(400).json({ 
        message: 'PayPal account required for withdrawals. Please ensure your email is verified.' 
      });
    }

    // Check available balance from earnings
    const earnings = await storage.getEarningsForWorker(req.user.id);
    const availableBalance = earnings
      .filter(e => e.status === 'available')
      .reduce((sum, e) => sum + e.amount, 0);

    if (amount > availableBalance) {
      return res.status(400).json({ 
        message: `Insufficient balance. Available: $${availableBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}` 
      });
    }

    // Create withdrawal record
    const withdrawalData = {
      userId: req.user.id,
      amount: -amount, // Negative amount for withdrawal
      type: 'withdrawal',
      status: 'pending',
      paymentMethod: method,
      description: `Withdrawal of $${amount.toFixed(2)}`,
      metadata: JSON.stringify({
        destinationAccountId,
        method,
        requestedAt: new Date().toISOString()
      })
    };

    const withdrawal = await storage.createPayment(withdrawalData);

    // Process PayPal payout for actual transfers in production
    if (method === 'paypal' && user.email) {
      try {
        const { payoutBatchId, payoutItemId } = await createPayPalPayout(
          user.email,
          amount,
          'USD',
          `withdrawal_${withdrawal.id}`,
          `Withdrawal of $${amount.toFixed(2)}`
        );
        
        // Update withdrawal with PayPal transaction IDs
        await storage.updatePayment(withdrawal.id, {
          transactionId: payoutBatchId,
          paypalPaymentId: payoutItemId,
          status: 'processing'
        });
      } catch (error) {
        console.error('PayPal payout error:', error);
        await storage.updatePayment(withdrawal.id, { status: 'failed' });
        return res.status(500).json({ message: 'Failed to process PayPal withdrawal' });
      }
    }

    res.json({
      success: true,
      withdrawal,
      message: 'Withdrawal request submitted successfully',
      estimatedProcessingTime: '1-3 business days'
    });

  } catch (error) {
    console.error('Error processing withdrawal:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid withdrawal data',
        errors: error.errors
      });
    }

    res.status(500).json({ 
      message: 'Failed to process withdrawal',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/payments/balance - Get user's current balance
router.get('/balance', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get earnings for balance calculation
    const earnings = await storage.getEarningsForWorker(req.user.id);
    const payments = await storage.getPaymentsByUserId(req.user.id);

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
    const availableEarnings = earnings
      .filter(e => e.status === 'available')
      .reduce((sum, e) => sum + e.amount, 0);
    const pendingEarnings = earnings
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalSpent = payments
      .filter(p => p.amount > 0 && p.type !== 'withdrawal')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalWithdrawn = payments
      .filter(p => p.type === 'withdrawal' && p.status === 'completed')
      .reduce((sum, p) => sum + Math.abs(p.amount), 0);

    res.json({
      available: availableEarnings - totalWithdrawn,
      pending: pendingEarnings,
      totalEarnings,
      totalSpent,
      totalWithdrawn,
      currency: 'USD'
    });

  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ 
      message: 'Failed to fetch balance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ------------------------------------------------------
// POST /api/payments/create-order – Create PayPal order
// ------------------------------------------------------
router.post('/create-order', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    const schema = z.object({
      amount: z.number().positive(),
      currency: z.string().default('USD'),
      jobId: z.string(),
      description: z.string().optional()
    });

    const { amount, currency, jobId, description } = schema.parse(req.body);

    const { orderId, approvalUrl } = await createPayPalOrder(
      amount,
      currency,
      jobId,
      description
    );

    res.json({ orderId, approvalUrl });
  } catch (err) {
    console.error('Create order error:', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request', errors: err.errors });
    }
    res.status(500).json({ message: 'Failed to create PayPal order' });
  }
});

// ------------------------------------------------------
// POST /api/payments/capture – Capture PayPal order
// ------------------------------------------------------
router.post('/capture', isAuthenticated, async (req: Request, res: Response) => {
  const schema = z.object({ orderId: z.string() });
  try {
    const { orderId } = schema.parse(req.body);
    const capture = await capturePayPalOrder(orderId);
    
    // Update payment status in database
    await storage.updatePaymentStatus(orderId as any, 'succeeded');
    
    res.json({ 
      captureId: capture.captureId,
      status: capture.status,
      amount: capture.amount,
      currency: capture.currency
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: 'Invalid request', errors: err.errors });
    console.error('Capture error:', err);
    res.status(500).json({ message: 'Failed to capture PayPal payment' });
  }
});

// ------------------------------------------------------
// POST /api/payments/release – Release escrow to worker (PayPal payout)
// ------------------------------------------------------
router.post('/release', isAuthenticated, async (req: Request, res: Response) => {
  const schema = z.object({
    paymentId: z.number(),
    amount: z.number().positive(),
  });
  try {
    const { paymentId, amount } = schema.parse(req.body);
    const payment = await storage.getPayment(paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (!payment.workerId) return res.status(400).json({ message: 'Payment not associated with worker' });

    // Send payout to worker's PayPal account
    const worker = await storage.getUser(payment.workerId);
    if (!worker?.email) return res.status(400).json({ message: 'Worker has no PayPal email' });

    const { payoutBatchId, payoutItemId } = await createPayPalPayout(
      worker.email,
      amount,
      'USD',
      payment.jobId?.toString() ?? paymentId.toString(),
      `Payment release for job ${payment.jobId}`
    );

    await storage.updatePaymentStatus(paymentId, 'completed');
    res.json({ success: true, payoutBatchId, payoutItemId });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: 'Invalid request', errors: err.errors });
    console.error('Release error:', err);
    res.status(500).json({ message: 'Failed to release payment' });
  }
});

// ------------------------------------------------------
// POST /api/payments/refund – Refund a completed payment
// ------------------------------------------------------
router.post('/refund', isAuthenticated, async (req: Request, res: Response) => {
  const schema = z.object({ 
    captureId: z.string(), 
    amount: z.number().positive().optional(),
    currency: z.string().default('USD'),
    reason: z.string().optional()
  });
  try {
    const { captureId, amount, currency, reason } = schema.parse(req.body);
    const refund = await refundPayPalPayment(captureId, amount, currency, reason);
    res.json({ success: true, refundId: refund.refundId, status: refund.status });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: 'Invalid request', errors: err.errors });
    console.error('Refund error:', err);
    res.status(500).json({ message: 'Failed to refund payment' });
  }
});

export { router as paymentsRouter };
