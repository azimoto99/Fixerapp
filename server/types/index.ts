import { Request } from 'express';
import { User } from '../storage';

// Base authenticated request type
export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    username: string;
    email: string;
    accountType: string;
  };
}

// Application types
export interface Application {
  id: number;
  workerId: number;
  jobId: number;
  status: string;
  message: string | null;
  dateApplied: Date | null;
  hourlyRate: number | null;
  expectedDuration: string | null;
  coverLetter: string | null;
  updatedAt?: Date;
}

// Job types
export interface Job {
  id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  budget: number;
  duration?: string;
  skills?: string[];
  images?: string[];
  paymentType: 'fixed' | 'hourly';
  hourlyRate?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  posterId: number;
  workerId?: number;
  status: 'pending' | 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

// Payment types
export interface Payment {
  id: number;
  userId: number;
  workerId: number;
  amount: number;
  serviceFee: number;
  type: 'transfer' | 'refund';
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  paymentMethod: 'stripe';
  transactionId: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  stripeConnectAccountId?: string;
  jobId: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Earning types
export interface Earning {
  id: number;
  workerId: number;
  jobId: number;
  amount: number;
  serviceFee: number;
  netAmount: number;
  status: 'pending' | 'paid' | 'failed' | 'reversed';
  transactionId: string;
  stripeAccountId: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification types
export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  sourceId: number;
  sourceType: string;
  metadata?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Stripe types
export interface StripeTransfer {
  id: string;
  amount: number;
  currency: string;
  destination: string;
  description?: string;
  status: 'paid' | 'pending' | 'failed' | 'reversed';
  metadata: {
    jobId: string;
    applicationId: string;
    workerId: string;
    posterId: string;
  };
}

export interface StripeAccount {
  id: string;
  type: string;
  email: string;
  business_type: string;
  capabilities: {
    card_payments: { requested: boolean };
    transfers: { requested: boolean };
  };
  requirements?: {
    currently_due?: string[];
    alternatives?: string[];
    current_deadline?: number;
    disabled_reason?: string;
    errors?: Array<{
      code: string;
      reason: string;
      requirement: string;
    }>;
    eventually_due?: string[];
    past_due?: string[];
    pending_verification?: string[];
  };
  payouts_enabled: boolean;
  charges_enabled: boolean;
  details_submitted: boolean;
  metadata: {
    userId: string;
  };
} 