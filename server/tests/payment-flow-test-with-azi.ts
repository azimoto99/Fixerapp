/**
 * Test script for verifying the entire Stripe Connect payment flow
 * This version is configured to use Azi's account which has transfers capability enabled
 */

import Stripe from "stripe";
import { storage } from "../storage";
import { db } from "../db";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
});

async function main() {
  try {
    console.log('------------------------------------------------------');
    console.log('STRIPE CONNECT PAYMENT FLOW TEST - PAYMENT TO WORKER');
    console.log('------------------------------------------------------\n');
    
    // 1. Find a worker with a Stripe Connect account (use Azi specifically)
    console.log('1. Finding worker with Stripe Connect account...');
    const worker = await storage.getUserByUsername('Azi');
    
    if (!worker || !worker.stripeConnectAccountId) {
      throw new Error('Worker not found or missing Connect account');
    }
    
    console.log(`Found worker: ${worker.username} (ID: ${worker.id}) with Connect account: ${worker.stripeConnectAccountId}`);
    console.log(`Connect account status: ${worker.stripeConnectAccountStatus || 'unknown'}`);
    
    // 2. Create a test job for the worker
    console.log('\n2. Finding or creating test job...');
    const existingJobs = await storage.getJobs({ workerId: worker.id, status: 'assigned' });
    let job = existingJobs.length > 0 ? existingJobs[0] : null;
    
    if (!job) {
      console.log('Creating a test job for the worker...');
      
      // Find job poster with Stripe customer ID
      const poster = await storage.getUserByUsername('jobposter');
      if (!poster || !poster.stripeCustomerId) {
        throw new Error('Job poster not found or missing Stripe customer ID');
      }
      
      // Create a new job
      job = await storage.createJob({
        title: "Test Payment Job",
        description: "This is a test job for payment processing",
        category: "Home Maintenance",
        posterId: poster.id,
        workerId: worker.id,
        status: "assigned",
        paymentType: "fixed",
        paymentAmount: 50,
        totalAmount: 55, // Including service fee
        location: "Test Location",
        latitude: 37.7749,
        longitude: -122.4194,
        dateNeeded: new Date(),
        requiredSkills: ["Cleaning"],
        equipmentProvided: false
      });
      
      console.log(`Created test job: "${job.title}" (ID: ${job.id})`);
    } else {
      console.log(`Using existing job: "${job.title}" (ID: ${job.id})`);
    }
    
    // 3. Create payment for the job
    console.log('\n3. Creating payment for job...');
    const amount = job.paymentAmount;
    const serviceFee = job.serviceFee || 5;
    const netAmount = amount - serviceFee;
    
    console.log(`Job payment amount: $${amount}, Service fee: $${serviceFee}, Net amount: $${netAmount}`);
    
    // 4. Create a Stripe payment intent
    console.log('\n4. Creating Stripe payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method_types: ['card'],
      description: `Payment for job: ${job.title}`,
      metadata: {
        jobId: job.id.toString(),
        workerId: worker.id.toString()
      }
    });
    
    console.log(`Created payment intent with ID: ${paymentIntent.id}`);
    
    // 5. Record the payment in our database
    console.log('\n5. Creating payment record in our database...');
    const payment = await storage.createPayment({
      userId: job.posterId,
      amount: amount,
      type: 'charge',
      status: 'pending',
      paymentMethod: 'credit_card',
      transactionId: paymentIntent.id,
      jobId: job.id,
      description: `Payment for job: ${job.title}`,
      metadata: {
        stripeFee: serviceFee,
        netAmount: netAmount
      }
    });
    
    console.log(`Created payment record with ID: ${payment.id}`);
    
    // 6. Create an earning record for the worker
    console.log('\n6. Creating earning record for worker...');
    const earning = await storage.createEarning({
      workerId: worker.id,
      jobId: job.id,
      amount: amount,
      serviceFee: serviceFee,
      netAmount: netAmount
    });
    
    console.log(`Created earning record with ID: ${earning.id}`);
    
    // 7. Simulate a successful payment by updating the payment intent status
    console.log('\n7. Simulating successful payment intent...');
    
    // In production, this happens through webhook events
    console.log('Updating payment status to "completed"...');
    await storage.updatePaymentStatus(payment.id, 'completed', paymentIntent.id);
    
    // 8. Create a transfer to the worker's Connect account
    console.log('\n8. Creating Stripe transfer to worker account...');
    console.log(`Transferring $${netAmount} to worker account ${worker.stripeConnectAccountId}...`);
    
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(netAmount * 100), // Convert to cents
        currency: 'usd',
        destination: worker.stripeConnectAccountId,
        description: `Payment for job: ${job.title}`,
        metadata: {
          jobId: job.id.toString(),
          workerId: worker.id.toString(),
          earningId: earning.id.toString()
        }
      });
      
      console.log(`Transfer successful! Transfer ID: ${transfer.id}`);
      
      // Update earning status
      await storage.updateEarningStatus(earning.id, 'paid', new Date());
      
      console.log('Updated earning record to "paid" status');
      
      // Create notification for worker
      await storage.createNotification({
        userId: worker.id,
        title: 'Payment Received',
        message: `You received $${netAmount} for job: ${job.title}`,
        type: 'payment_received',
        sourceId: job.id,
        sourceType: 'job',
        metadata: {
          amount: netAmount,
          transferId: transfer.id
        }
      });
      
      console.log('Created payment notification for worker');
      
    } catch (error: any) {
      console.error('Transfer failed:', error.message);
      console.log('The account may not be properly set up to receive payments.');
      console.log('Check that the account has been fully onboarded with Stripe Connect.');
    }
    
    console.log('\n------------------------------------------------------');
    console.log('TEST COMPLETE');
    console.log('------------------------------------------------------');
    
  } catch (error: any) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
main();