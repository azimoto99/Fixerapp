import { createMocks } from 'node-mocks-http';
import handler from '@/server/api/wallet/balance';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('Wallet Balance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed',
    });
  });

  it('should return 401 if user is not authenticated', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    (getServerSession as jest.Mock).mockResolvedValue(null);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Unauthorized',
    });
  });

  it('should create a new wallet if it does not exist', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    };

    const mockNewWallet = {
      balance: 0,
      pendingBalance: 0,
    };

    const { req, res } = createMocks({
      method: 'GET',
    });

    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.wallet.create as jest.Mock).mockResolvedValue(mockNewWallet);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      availableBalance: mockNewWallet.balance,
      pendingBalance: mockNewWallet.pendingBalance,
    });

    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: {
        userId: mockUser.id,
        balance: 0,
        pendingBalance: 0,
      },
    });
  });

  it('should return existing wallet balance', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    };

    const mockWallet = {
      balance: 100.50,
      pendingBalance: 25.75,
    };

    const { req, res } = createMocks({
      method: 'GET',
    });

    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockWallet);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      availableBalance: mockWallet.balance,
      pendingBalance: mockWallet.pendingBalance,
    });

    expect(prisma.wallet.create).not.toHaveBeenCalled();
  });
}); 