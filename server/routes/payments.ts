import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../auth-helpers';
import { z } from 'zod';

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
      method: z.enum(['bank_transfer', 'stripe_connect']).default('stripe_connect')
    });

    const { amount, destinationAccountId, method } = schema.parse(req.body);

    // Get user to check if they have Stripe Connect account
    const user = await storage.getUser(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (method === 'stripe_connect' && !user.stripeConnectAccountId) {
      return res.status(400).json({ 
        message: 'Stripe Connect account required for withdrawals. Please complete your onboarding first.' 
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

    // Integrate with Stripe Connect for actual transfers in production
    // This would use stripe.transfers.create() with proper Connect account handling

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

export { router as paymentsRouter };
