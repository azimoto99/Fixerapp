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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get user's wallet and Stripe Connect account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        wallet: true,
      },
    });

    if (!user?.wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (!user.stripeConnectId) {
      return res.status(400).json({ error: 'Stripe Connect account not set up' });
    }

    if (user.wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Create a transfer to the user's Stripe Connect account
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      destination: user.stripeConnectId,
      metadata: {
        userId: session.user.id,
        type: 'withdrawal',
      },
    });

    // Create a transaction record
    const transaction = await prisma.transaction.create({
      data: {
        walletId: user.wallet.id,
        amount: amount,
        type: 'debit',
        status: 'completed',
        description: 'Withdrawal to Stripe Connect account',
        stripePaymentId: transfer.id,
      },
    });

    // Update wallet balance
    await prisma.wallet.update({
      where: { id: user.wallet.id },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return res.status(500).json({ 
      error: 'Failed to process withdrawal',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 