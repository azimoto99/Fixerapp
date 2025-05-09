/**
 * This script sets up a job poster with a Stripe customer ID
 */
import Stripe from 'stripe';
import { storage } from '../storage';

async function setupJobPoster() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Missing STRIPE_SECRET_KEY');
    }
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { 
      apiVersion: '2025-04-30.basil' 
    });
    
    // Get our job poster user
    const user = await storage.getUserByUsername('jobposter');
    if (!user) {
      throw new Error('Job poster user not found');
    }
    
    console.log('Found job poster:', user.username, '(ID:', user.id, ')');
    
    // Create a Stripe customer for this user
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: user.fullName,
        email: user.email
      });
      
      console.log('Created Stripe customer:', customer.id);
      
      // Update the user with the Stripe customer ID
      const updatedUser = await storage.updateUser(user.id, { stripeCustomerId: customer.id });
      console.log('Updated user with Stripe customer ID:', customer.id);
    } else {
      console.log('User already has Stripe customer ID:', user.stripeCustomerId);
    }
    
    console.log('Job poster setup complete');
  } catch (err) {
    console.error('Error setting up job poster:', err);
  }
}

// Run the function
setupJobPoster();