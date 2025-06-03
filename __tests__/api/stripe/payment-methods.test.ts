import { createMocks } from 'node-mocks-http';
import handler from '@/server/api/stripe/payment-methods';
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
    },
  },
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentMethods: {
      list: jest.fn(),
    },
  }));
});

describe('List Payment Methods', () => {
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

  it('should return empty array for users without Stripe customer ID', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    };

    const { req, res } = createMocks({
      method: 'GET',
    });

    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual([]);
  });

  it('should return payment methods for users with Stripe customer ID', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    };

    const mockPaymentMethods = {
      data: [
        {
          id: 'pm_123',
          card: {
            brand: 'visa',
            last4: '4242',
          },
        },
        {
          id: 'pm_456',
          card: {
            brand: 'mastercard',
            last4: '5555',
          },
        },
      ],
    };

    const { req, res } = createMocks({
      method: 'GET',
    });

    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      stripeCustomerId: 'cus_123',
    });

    const mockStripe = new Stripe('sk_test_123');
    (mockStripe.paymentMethods.list as jest.Mock).mockResolvedValue(mockPaymentMethods);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockPaymentMethods.data);
  });
}); 