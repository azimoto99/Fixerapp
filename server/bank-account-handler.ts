/**
 * Worker Bank Account Handler
 * Handles setting up bank accounts for workers to receive payments via Stripe Connect
 */

import { storage } from "./storage";
import Stripe from "stripe";
import { User } from "@shared/schema";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any,
});

/**
 * Creates a bank account token for a worker's Stripe Connect account
 * @param userId The ID of the user (worker)
 * @param bankAccountDetails The bank account details to create a token for
 * @returns Result object with success status and link to complete the setup
 */
export async function createBankAccountToken(
  userId: number, 
  bankAccountDetails: {
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
    accountHolderType: "individual" | "company";
    country: string;
    currency: string;
  }
): Promise<{
  success: boolean;
  message: string;
  bankAccountId?: string;
  connectAccountId?: string;
}> {
  try {
    // 1. Get the user
    const user = await storage.getUser(userId);
    
    if (!user) {
      return {
        success: false,
        message: `User #${userId} not found`
      };
    }
    
    // 2. Check if the user has a Stripe Connect account
    if (!user.stripeConnectAccountId) {
      return {
        success: false,
        message: `User #${userId} does not have a Stripe Connect account`
      };
    }
    
    // 3. Create a bank account token
    const token = await stripe.tokens.create({
      bank_account: {
        country: bankAccountDetails.country,
        currency: bankAccountDetails.currency,
        account_holder_name: bankAccountDetails.accountHolderName,
        account_holder_type: bankAccountDetails.accountHolderType,
        routing_number: bankAccountDetails.routingNumber,
        account_number: bankAccountDetails.accountNumber,
      },
    });
    
    // 4. Attach the bank account to the Connect account
    const bankAccount = await stripe.accounts.createExternalAccount(
      user.stripeConnectAccountId,
      {
        external_account: token.id,
      }
    );
    
    // 5. Update user record to indicate banking details are complete
    await storage.updateUser(userId, {
      stripeBankingDetailsComplete: true
    });
    
    return {
      success: true,
      message: "Bank account added successfully",
      bankAccountId: typeof bankAccount.id === 'string' ? bankAccount.id : undefined,
      connectAccountId: user.stripeConnectAccountId
    };
  } catch (error: any) {
    console.error('Error creating bank account token:', error);
    
    return {
      success: false,
      message: `Failed to create bank account: ${error.message}`
    };
  }
}

/**
 * Gets the list of bank accounts for a user's Stripe Connect account
 * @param userId The ID of the user (worker)
 * @returns List of bank accounts
 */
export async function getUserBankAccounts(userId: number): Promise<{
  success: boolean;
  message: string;
  bankAccounts?: any[];
}> {
  try {
    // 1. Get the user
    const user = await storage.getUser(userId);
    
    if (!user) {
      return {
        success: false,
        message: `User #${userId} not found`
      };
    }
    
    // 2. Check if the user has a Stripe Connect account
    if (!user.stripeConnectAccountId) {
      return {
        success: false,
        message: `User #${userId} does not have a Stripe Connect account`
      };
    }
    
    // 3. Get bank accounts attached to the Connect account
    const bankAccounts = await stripe.accounts.listExternalAccounts(
      user.stripeConnectAccountId,
      { object: 'bank_account' }
    );
    
    return {
      success: true,
      message: "Bank accounts retrieved successfully",
      bankAccounts: bankAccounts.data
    };
  } catch (error: any) {
    console.error('Error getting user bank accounts:', error);
    
    return {
      success: false,
      message: `Failed to get bank accounts: ${error.message}`
    };
  }
}

/**
 * Sets the default bank account for a user's Stripe Connect account
 * @param userId The ID of the user (worker)
 * @param bankAccountId The ID of the bank account to set as default
 * @returns Result object with success status
 */
export async function setDefaultBankAccount(
  userId: number,
  bankAccountId: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // 1. Get the user
    const user = await storage.getUser(userId);
    
    if (!user) {
      return {
        success: false,
        message: `User #${userId} not found`
      };
    }
    
    // 2. Check if the user has a Stripe Connect account
    if (!user.stripeConnectAccountId) {
      return {
        success: false,
        message: `User #${userId} does not have a Stripe Connect account`
      };
    }
    
    // 3. Update the bank account to be the default
    await stripe.accounts.updateExternalAccount(
      user.stripeConnectAccountId,
      bankAccountId,
      { default_for_currency: true }
    );
    
    return {
      success: true,
      message: "Default bank account updated successfully"
    };
  } catch (error: any) {
    console.error('Error setting default bank account:', error);
    
    return {
      success: false,
      message: `Failed to set default bank account: ${error.message}`
    };
  }
}

/**
 * Deletes a bank account from a user's Stripe Connect account
 * @param userId The ID of the user (worker)
 * @param bankAccountId The ID of the bank account to delete
 * @returns Result object with success status
 */
export async function deleteBankAccount(
  userId: number,
  bankAccountId: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // 1. Get the user
    const user = await storage.getUser(userId);
    
    if (!user) {
      return {
        success: false,
        message: `User #${userId} not found`
      };
    }
    
    // 2. Check if the user has a Stripe Connect account
    if (!user.stripeConnectAccountId) {
      return {
        success: false,
        message: `User #${userId} does not have a Stripe Connect account`
      };
    }
    
    // 3. Delete the bank account
    await stripe.accounts.deleteExternalAccount(
      user.stripeConnectAccountId,
      bankAccountId
    );
    
    // 4. Check if there are any remaining bank accounts
    const bankAccounts = await stripe.accounts.listExternalAccounts(
      user.stripeConnectAccountId,
      { object: 'bank_account' }
    );
    
    // 5. If no bank accounts remain, update the user record
    if (bankAccounts.data.length === 0) {
      await storage.updateUser(userId, {
        stripeBankingDetailsComplete: false
      });
    }
    
    return {
      success: true,
      message: "Bank account deleted successfully"
    };
  } catch (error: any) {
    console.error('Error deleting bank account:', error);
    
    return {
      success: false,
      message: `Failed to delete bank account: ${error.message}`
    };
  }
}

/**
 * Checks if a user's Stripe Connect account is ready to receive payouts
 * @param userId The ID of the user (worker)
 * @returns Result object with account status details
 */
export async function checkConnectAccountStatus(userId: number): Promise<{
  success: boolean;
  message: string;
  canReceivePayouts: boolean;
  accountStatus?: string;
  missingRequirements?: string[];
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  bankAccountsAvailable?: boolean;
}> {
  try {
    // 1. Get the user
    const user = await storage.getUser(userId);
    
    if (!user) {
      return {
        success: false,
        message: `User #${userId} not found`,
        canReceivePayouts: false
      };
    }
    
    // 2. Check if the user has a Stripe Connect account
    if (!user.stripeConnectAccountId) {
      return {
        success: false,
        message: `User #${userId} does not have a Stripe Connect account`,
        canReceivePayouts: false
      };
    }
    
    // 3. Retrieve the Connect account details
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    
    // 4. Check the account status
    const detailsSubmitted = account.details_submitted;
    const payoutsEnabled = account.payouts_enabled;
    const transfersEnabled = account.capabilities?.transfers === 'active';
    
    // 5. Get bank accounts
    const bankAccounts = await stripe.accounts.listExternalAccounts(
      user.stripeConnectAccountId,
      { object: 'bank_account' }
    );
    
    const hasBankAccounts = bankAccounts.data.length > 0;
    
    // 6. Determine if the account can receive payouts
    const canReceivePayouts = detailsSubmitted && payoutsEnabled && transfersEnabled && hasBankAccounts;
    
    // 7. Get missing requirements if any
    const missingRequirements = account.requirements?.currently_due || [];
    
    // 8. Update user record with the latest status
    const updateData: Partial<User> = {
      stripeTransfersEnabled: transfersEnabled,
      stripeAccountUpdatedAt: new Date(),
      stripeBankingDetailsComplete: hasBankAccounts
    };
    
    // Only update if there's been a change
    if (
      user.stripeTransfersEnabled !== transfersEnabled ||
      user.stripeBankingDetailsComplete !== hasBankAccounts
    ) {
      await storage.updateUser(userId, updateData);
    }
    
    return {
      success: true,
      message: "Account status retrieved successfully",
      canReceivePayouts,
      accountStatus: account.details_submitted ? "complete" : "pending",
      missingRequirements,
      detailsSubmitted,
      payoutsEnabled,
      bankAccountsAvailable: hasBankAccounts
    };
  } catch (error: any) {
    console.error('Error checking Connect account status:', error);
    
    return {
      success: false,
      message: `Failed to check account status: ${error.message}`,
      canReceivePayouts: false
    };
  }
}