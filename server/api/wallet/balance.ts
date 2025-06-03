import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

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

    // Get user's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
      select: {
        balance: true,
        pendingBalance: true,
      },
    });

    if (!wallet) {
      // Create a new wallet if it doesn't exist
      const newWallet = await prisma.wallet.create({
        data: {
          userId: session.user.id,
          balance: 0,
          pendingBalance: 0,
        },
      });

      return res.status(200).json({
        availableBalance: newWallet.balance,
        pendingBalance: newWallet.pendingBalance,
      });
    }

    return res.status(200).json({
      availableBalance: wallet.balance,
      pendingBalance: wallet.pendingBalance,
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch wallet balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 