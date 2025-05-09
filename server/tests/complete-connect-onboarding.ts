/**
 * This utility helps complete the onboarding of Stripe Connect accounts
 * by generating account links and checking the current status.
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

// Helper to generate account links for onboarding
async function generateAccountLink(connectAccountId: string, refreshUrl: string, returnUrl: string) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
      collect: 'eventually_due'
    });
    
    return accountLink.url;
  } catch (error) {
    console.error('Error creating account link:', (error as Error).message);
    return null;
  }
}

// Helper to check account status
async function checkAccountStatus(connectAccountId: string) {
  try {
    const account = await stripe.accounts.retrieve(connectAccountId);
    
    console.log('Account Details:');
    console.log(`- ID: ${account.id}`);
    console.log(`- Email: ${account.email}`);
    console.log(`- Type: ${account.type}`);
    console.log(`- Business Type: ${account.business_type}`);
    console.log(`- Charges Enabled: ${account.charges_enabled}`);
    console.log(`- Payouts Enabled: ${account.payouts_enabled}`);
    console.log(`- Requirements Disabled: ${account.requirements?.disabled_reason || 'None'}`);
    
    if (account.requirements?.currently_due?.length) {
      console.log('\nRequirements Currently Due:');
      account.requirements.currently_due.forEach((req, i) => 
        console.log(`${i+1}. ${req}`)
      );
    } else {
      console.log('\nNo requirements currently due.');
    }
    
    // Check capabilities
    if (account.capabilities) {
      console.log('\nCapabilities:');
      Object.entries(account.capabilities).forEach(([capability, status]) => {
        console.log(`- ${capability}: ${status}`);
      });
    }

    return account;
  } catch (error) {
    console.error('Error retrieving account:', (error as Error).message);
    return null;
  }
}

async function main() {
  try {
    console.log('======================================================');
    console.log('STRIPE CONNECT ACCOUNT ONBOARDING UTILITY');
    console.log('======================================================\n');
    
    // 1. Get all workers with Connect accounts
    console.log('Finding workers with Stripe Connect accounts...\n');
    const users = await storage.getAllUsers();
    const workersWithConnectAccounts = users.filter(u => 
      u.accountType === 'worker' && u.stripeConnectAccountId
    );
    
    if (workersWithConnectAccounts.length === 0) {
      console.error('No workers found with Stripe Connect accounts.');
      return;
    }
    
    console.log(`Found ${workersWithConnectAccounts.length} workers with Connect accounts:\n`);
    workersWithConnectAccounts.forEach((worker, i) => {
      console.log(`${i+1}. ${worker.username} (ID: ${worker.id}) - Connect Account: ${worker.stripeConnectAccountId}`);
    });
    
    console.log('\nChecking account status for each worker...\n');
    
    for (const worker of workersWithConnectAccounts) {
      if (!worker.stripeConnectAccountId) continue;
      
      console.log(`\n======================================================`);
      console.log(`Worker: ${worker.username} (ID: ${worker.id})`);
      console.log(`======================================================`);
      
      // Check account status
      const account = await checkAccountStatus(worker.stripeConnectAccountId);
      
      if (!account) continue;
      
      // Generate account link if onboarding incomplete
      if (!account.charges_enabled || !account.payouts_enabled || 
          (account.requirements?.currently_due && account.requirements.currently_due.length > 0)) {
        
        console.log('\nAccount onboarding is incomplete. Generating onboarding link...');
        
        const accountLinkUrl = await generateAccountLink(
          worker.stripeConnectAccountId,
          'http://localhost:5000/stripe/connect/refresh',
          'http://localhost:5000/stripe/connect/success'
        );
        
        if (accountLinkUrl) {
          console.log('\nOnboarding URL (valid for 5 minutes):');
          console.log(accountLinkUrl);
          console.log('\nShare this URL with the worker to complete their onboarding process.');
        }
      } else {
        console.log('\n✅ Account is fully onboarded and ready to receive payments!');
      }
    }
    
    console.log('\n======================================================');
    console.log('UTILITY COMPLETED');
    console.log('======================================================');
  } catch (error) {
    console.error('Error running utility:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the utility
main();