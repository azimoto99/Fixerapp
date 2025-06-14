// @ts-nocheck
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

    // Check if user already has a Stripe Connect account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeConnectId: true },
    });

    if (user?.stripeConnectId) {
      // If user already has a Stripe Connect account, create a new account link
      const accountLink = await stripe.accountLinks.create({
        account: user.stripeConnectId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?success=true`,
        type: 'account_onboarding',
      });

      return res.status(200).json({ accountLinkUrl: accountLink.url });
    }

    // Create a new Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: session.user.email!,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        userId: session.user.id,
      },
    });

    // Save the Stripe Connect account ID to the user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { stripeConnectId: account.id },
    });

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?success=true`,
      type: 'account_onboarding',
    });

    return res.status(200).json({ accountLinkUrl: accountLink.url });
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return res.status(500).json({ 
      error: 'Failed to create Stripe Connect account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 