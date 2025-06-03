import { createMocks } from 'node-mocks-http';
import handler from '@/server/api/stripe/create-payment-method';
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
    customers: {
      create: jest.fn(),
    },
    setupIntents: {
      create: jest.fn(),
    },
  }));
});

describe('Create Payment Method', () => {
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

  it('should create a new customer and setup intent for new users', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    };

    const mockCustomer = {
      id: 'cus_123',
    };

    const mockSetupIntent = {
      client_secret: 'seti_123_secret_456',
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
    (mockStripe.customers.create as jest.Mock).mockResolvedValue(mockCustomer);
    (mockStripe.setupIntents.create as jest.Mock).mockResolvedValue(mockSetupIntent);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      clientSecret: mockSetupIntent.client_secret,
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { stripeCustomerId: mockCustomer.id },
    });
  });

  it('should use existing customer for users with Stripe customer ID', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    };

    const mockSetupIntent = {
      client_secret: 'seti_123_secret_456',
    };

    const { req, res } = createMocks({
      method: 'POST',
    });

    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      stripeCustomerId: 'cus_123',
    });

    const mockStripe = new Stripe('sk_test_123');
    (mockStripe.setupIntents.create as jest.Mock).mockResolvedValue(mockSetupIntent);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      clientSecret: mockSetupIntent.client_secret,
    });

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
}); 