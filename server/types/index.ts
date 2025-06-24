import { Request } from 'express';

// Base authenticated request type - Use Express.User for full type safety
export interface AuthenticatedRequest extends Request {
  user: Express.User;
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

// Enterprise Business Types
export interface EnterpriseBusiness {
  id: number;
  userId: number;
  businessName: string;
  businessDescription?: string;
  businessLogo?: string;
  businessType: string;
  businessWebsite?: string;
  businessPhone?: string;
  businessEmail?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  stripeSubscriptionId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HubPin {
  id: number;
  enterpriseId: number;
  title: string;
  description?: string;
  location: string;
  latitude: number;
  longitude: number;
  pinSize: 'large' | 'xlarge';
  pinColor: string;
  iconUrl?: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnterprisePosition {
  id: number;
  enterpriseId: number;
  hubPinId?: number;
  title: string;
  description: string;
  positionType: 'full-time' | 'part-time' | 'contract' | 'temporary';
  paymentType: 'hourly' | 'salary' | 'project';
  paymentAmount: number;
  paymentFrequency?: 'weekly' | 'bi-weekly' | 'monthly';
  requiredSkills: string[];
  benefits?: string;
  schedule?: string;
  isActive: boolean;
  positionsAvailable: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnterpriseApplication {
  id: number;
  positionId: number;
  applicantId: number;
  enterpriseId: number;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';
  coverLetter?: string;
  expectedSalary?: number;
  availableStartDate?: Date;
  notes?: string;
  reviewedBy?: number;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Insert types for creating new records
export type InsertEnterpriseBusiness = Omit<EnterpriseBusiness, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertHubPin = Omit<HubPin, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertEnterprisePosition = Omit<EnterprisePosition, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertEnterpriseApplication = Omit<EnterpriseApplication, 'id' | 'createdAt' | 'updatedAt'>; 