import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { stripe } from '../lib/stripe';
import { db } from '../db';
import { users } from '../db/schema';

const router = Router();

// Add this new endpoint
router.get('/check-connect-status', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's Stripe Connect account ID from the database
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        stripeConnectAccountId: true
      }
    });

    // Check if user has a Stripe Connect account
    const hasStripeConnect = !!user?.stripeConnectAccountId;

    if (hasStripeConnect) {
      // Verify the account is still valid with Stripe
      try {
        const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
        return res.json({ 
          hasStripeConnect: true,
          accountStatus: account.charges_enabled ? 'active' : 'pending'
        });
      } catch (error) {
        // If the account is invalid, return false
        return res.json({ hasStripeConnect: false });
      }
    }

    return res.json({ hasStripeConnect: false });
  } catch (error) {
    console.error('Error checking Stripe Connect status:', error);
    res.status(500).json({ error: 'Failed to check Stripe Connect status' });
  }
});

export default router; 