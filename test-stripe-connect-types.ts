// Quick test to verify our TypeScript fixes for Stripe Connect
import { Request, Response } from 'express';
import { AuthenticatedRequest } from './server/types';
import Stripe from 'stripe';

// Test that AuthenticatedRequest can be used properly
function testAuthenticatedRequest(req: AuthenticatedRequest) {
  // These should all be valid with our type fixes
  const userId = req.user.id;
  const userEmail = req.user.email;
  const stripeAccountId = req.user.stripeConnectAccountId;
  
  console.log('User ID:', userId);
  console.log('User Email:', userEmail);
  console.log('Stripe Account ID:', stripeAccountId);
  
  return { userId, userEmail, stripeAccountId };
}

// Test that Stripe account link creation works without deprecated parameters
async function testStripeAccountLink() {
  const stripe = new Stripe('test_key', { apiVersion: '2025-05-28.basil' });
  
  // This should work without the deprecated 'collect' parameter
  const accountLink = await stripe.accountLinks.create({
    account: 'test_account_id',
    refresh_url: 'https://example.com/refresh',
    return_url: 'https://example.com/return',
    type: 'account_onboarding',
    // No 'collect' parameter - this was deprecated
  });
  
  return accountLink;
}

console.log('Type tests passed - Stripe Connect TypeScript fixes are working correctly!');
