/**
 * Storage Extension Functions
 * 
 * Additional storage functions required for Stripe integration
 * that extend the base storage interface.
 */

import { storage } from '../storage';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users, payments } from '@shared/schema';

/**
 * Get users by Stripe customer ID
 */
export async function getUsersByStripeCustomerId(stripeCustomerId: string) {
  try {
    const result = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    
    // Add virtual fields to users
    return result.map(user => storage.addVirtualFields ? storage.addVirtualFields(user) : user);
  } catch (error) {
    console.error('Error getting users by Stripe customer ID:', error);
    return [];
  }
}

/**
 * Get users by Stripe Connect account ID
 */
export async function getUsersByStripeConnectAccountId(stripeConnectAccountId: string) {
  try {
    const result = await db.select().from(users).where(eq(users.stripeConnectAccountId, stripeConnectAccountId));
    
    // Add virtual fields to users
    return result.map(user => storage.addVirtualFields ? storage.addVirtualFields(user) : user);
  } catch (error) {
    console.error('Error getting users by Stripe Connect account ID:', error);
    return [];
  }
}

/**
 * Get payment by Stripe transaction ID (payment intent ID)
 */
export async function getPaymentByTransactionId(transactionId: string) {
  try {
    const [result] = await db.select().from(payments).where(eq(payments.transactionId, transactionId));
    return result;
  } catch (error) {
    console.error('Error getting payment by transaction ID:', error);
    return null;
  }
}

// Add the functions to the storage object
if (storage) {
  storage.getUsersByStripeCustomerId = getUsersByStripeCustomerId;
  storage.getUsersByStripeConnectAccountId = getUsersByStripeConnectAccountId;
  storage.getPaymentByTransactionId = getPaymentByTransactionId;
}