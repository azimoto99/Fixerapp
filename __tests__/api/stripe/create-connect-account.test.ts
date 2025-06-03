import { createMocks } from 'node-mocks-http';
import handler from '@/server/api/stripe/create-connect-account';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    accounts: {
      create: jest.fn(),
    },
    accountLinks: {
      create: jest.fn(),
    },
  }));
});

describe('Create Stripe Connect Account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed',
    });
  });

  it('should return 401 if user is not authenticated', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    (getServerSession as jest.Mock).mockResolvedValue(null);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Unauthorized',
    });
  });

  it('should create a new Stripe Connect account for new users', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    };

    const mockStripeAccount = {
      id: 'acct_123',
    };

    const mockAccountLink = {
      url: 'https://connect.stripe.com/setup/s/123',
    };

    const { req, res } = createMocks({
      method: 'POST',
    });

    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const mockStripe = new Stripe('sk_test_123');
    (mockStripe.accounts.create as jest.Mock).mockResolvedValue(mockStripeAccount);
    (mockStripe.accountLinks.create as jest.Mock).mockResolvedValue(mockAccountLink);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      onboardingUrl: mockAccountLink.url,
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { stripeConnectId: mockStripeAccount.id },
    });
  });

  it('should return existing account link for users with Stripe Connect', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    };

    const mockAccountLink = {
      url: 'https://connect.stripe.com/setup/s/123',
    };

    const { req, res } = createMocks({
      method: 'POST',
    });

    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      stripeConnectId: 'acct_123',
    });

    const mockStripe = new Stripe('sk_test_123');
    (mockStripe.accountLinks.create as jest.Mock).mockResolvedValue(mockAccountLink);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      onboardingUrl: mockAccountLink.url,
    });

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
}); 