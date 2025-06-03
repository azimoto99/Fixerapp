import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's Stripe Connect account ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeConnectId: true },
    });

    if (!user?.stripeConnectId) {
      return res.status(200).json({
        hasStripeConnect: false,
        accountStatus: null,
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(user.stripeConnectId);

    // Check if account is active
    const isActive = account.charges_enabled && account.payouts_enabled;
    const isPending = account.details_submitted && !isActive;

    return res.status(200).json({
      hasStripeConnect: true,
      accountStatus: isActive ? 'active' : isPending ? 'pending' : null,
      accountDetails: {
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
      },
    });
  } catch (error) {
    console.error('Error checking Stripe Connect status:', error);
    return res.status(500).json({ 
      error: 'Failed to check Stripe Connect status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 