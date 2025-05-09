/**
 * Test script to validate the job payment flow to worker accounts
 * This script simulates a job payment and the subsequent transfer to a worker's Stripe Connect account
 */

import Stripe from "stripe";
import { pool, db } from "../db";
import { storage } from "../storage";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
});

// Test function to simulate the job payment flow
async function testPaymentFlow() {
  try {
    console.log('------------------------------------------------------');
    console.log('STRIPE CONNECT PAYMENT FLOW TEST - PAYMENT TO WORKER');
    console.log('------------------------------------------------------');
    
    // 1. Get an active worker with a Stripe Connect account
    console.log('\n1. Finding worker with Stripe Connect account...');
    const users = await storage.getAllUsers();
    const worker = users.find(u => u.accountType === 'worker' && u.stripeConnectAccountId);
    
    if (!worker) {
      console.error('No worker found with a Stripe Connect account');
      return;
    }
    
    // Add a null guard to protect against potentially null Connect account ID
    if (!worker.stripeConnectAccountId) {
      console.error('Worker has null stripeConnectAccountId - cannot complete the test');
      return;
    }
    
    console.log(`Found worker: ${worker.username} (ID: ${worker.id}) with Connect account: ${worker.stripeConnectAccountId}`);
    console.log(`Connect account status: ${worker.stripeConnectAccountStatus || 'unknown'}`);
    
    // 2. Find or create a test job for this worker
    console.log('\n2. Finding or creating test job...');
    const jobs = await storage.getJobs();
    let job = jobs.find(j => j.workerId === worker.id);
    
    if (!job) {
      console.log('Creating a test job for the worker...');
      const poster = users.find(u => u.accountType === 'poster');
      
      if (!poster) {
        console.error('No job poster found in the database');
        return;
      }
      
      // The dateNeeded field is required according to our schema
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      job = await storage.createJob({
        title: "Test Payment Job",
        description: "This is a test job to verify payments",
        status: "completed",
        paymentAmount: 50,
        paymentType: "fixed",
        category: "Computer Repair",
        location: "Test Location",
        latitude: 37.7749,
        longitude: -122.4194,
        posterId: poster.id,
        dateNeeded: tomorrow
      });
      
      console.log(`Created test job: "${job.title}" (ID: ${job.id})`);
    } else {
      console.log(`Found existing job: "${job.title}" (ID: ${job.id})`);
    }
    
    // 3. Create a payment for the job
    console.log('\n3. Creating payment for job...');
    const serviceFee = 5; // Standard service fee
    const totalAmount = job.paymentAmount + serviceFee;
    const netAmount = job.paymentAmount - serviceFee;
    console.log(`Job payment amount: $${job.paymentAmount}, Service fee: $${serviceFee}, Net amount: $${netAmount}`);
    
    // 4. Create a Stripe payment intent for testing
    console.log('\n4. Creating Stripe payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        jobId: job.id.toString(),
        workerId: worker.id.toString()
      },
      capture_method: 'automatic'
    });
    
    console.log(`Created payment intent with ID: ${paymentIntent.id}`);
    
    // 5. Create a payment record in our database
    console.log('\n5. Creating payment record in our database...');
    const payment = await storage.createPayment({
      userId: job.posterId,
      amount: totalAmount,
      type: "job_payment",
      status: "completed",
      paymentMethod: "stripe",
      description: `Payment for job: ${job.title}`,
      jobId: job.id,
      transactionId: paymentIntent.id,
      metadata: { 
        clientSecret: paymentIntent.client_secret || 'test-secret'
      }
    });
    
    console.log(`Created payment record with ID: ${payment.id}`);
    
    // 6. Create an earning record for the worker
    console.log('\n6. Creating earning record for worker...');
    const earning = await storage.createEarning({
      jobId: job.id,
      workerId: worker.id,
      amount: job.paymentAmount,
      serviceFee: serviceFee,
      netAmount: netAmount,
      status: "pending"
    });
    
    console.log(`Created earning record with ID: ${earning.id}`);
    
    // 7. Create a transfer to the worker's Connect account
    console.log('\n7. Creating Stripe transfer to worker account...');
    console.log(`Transferring $${netAmount} to worker account ${worker.stripeConnectAccountId}...`);
    
    try {
      // We've already checked for null above, but TypeScript might still show a warning,
      // so we'll assert the type here for extra safety
      const connectAccountId: string = worker.stripeConnectAccountId as string;
      
      const transfer = await stripe.transfers.create({
        amount: Math.round(netAmount * 100), // Convert to cents
        currency: 'usd',
        destination: connectAccountId,
        transfer_group: `job-${job.id}`,
        metadata: {
          jobId: job.id.toString(),
          workerId: worker.id.toString(),
          earningId: earning.id.toString(),
          paymentId: payment.id.toString(),
          test: "true"
        },
        description: `Test payment for job: ${job.title}`
      });
      
      console.log(`Transfer successful! Transfer ID: ${transfer.id}`);
      console.log(`Transfer details: $${transfer.amount / 100} to ${transfer.destination}`);
      
      // 8. Update the earning status
      console.log('\n8. Updating earning status to "processing"...');
      await storage.updateEarningStatus(earning.id, 'processing', new Date());
      console.log('Earning record updated');
      
      // 9. Check if webhook has processed the transfer
      console.log('\n9. Note: Webhooks would typically update the earning status to "paid" when transfer is complete');
    } catch (error) {
      console.error(`Transfer failed: ${(error as Error).message}`);
      console.error('The account may not be properly set up to receive payments.');
      console.error('Check that the account has been fully onboarded with Stripe Connect.');
    }
    
    console.log('\n------------------------------------------------------');
    console.log('TEST COMPLETE');
    console.log('------------------------------------------------------');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the test
testPaymentFlow();