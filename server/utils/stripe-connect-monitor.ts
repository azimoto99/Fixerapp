import { EventEmitter } from 'events';
import Stripe from 'stripe';
import { storage } from '../storage';

interface StripeAccountStatus {
  accountId: string;
  isActive: boolean;
  requiresAttention: boolean;
  requirements: string[];
  lastChecked: Date;
}

export class StripeConnectMonitor extends EventEmitter {
  private stripe: Stripe;
  private accountStatuses: Map<string, StripeAccountStatus> = new Map();
  private checkInterval: number;
  private isRunning: boolean = false;

  constructor(stripe: Stripe, checkIntervalMs: number = 5 * 60 * 1000) {
    super();
    this.stripe = stripe;
    this.checkInterval = checkIntervalMs;
  }

  public async startMonitoring() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // Initial load of all Connect accounts
      const users = await storage.getAllUsers();
      const connectAccounts = users.filter(user => user.stripeConnectAccountId);
      
      for (const user of connectAccounts) {
        if (user.stripeConnectAccountId) {
          await this.checkAccount(user.stripeConnectAccountId, user.id);
        }
      }

      // Start periodic checks
      setInterval(() => {
        this.checkAllAccounts();
      }, this.checkInterval);
    } catch (error) {
      console.error('Error starting Stripe Connect monitor:', error);
      this.emit('error', error);
    }
  }

  private async checkAllAccounts() {
    for (const [accountId, status] of this.accountStatuses) {
      try {
        await this.checkAccount(accountId);
      } catch (error) {
        console.error(`Error checking account ${accountId}:`, error);
      }
    }
  }

  private async checkAccount(accountId: string, userId?: number) {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      
      const newStatus: StripeAccountStatus = {
        accountId,
        isActive: account.charges_enabled && account.payouts_enabled,
        requiresAttention: account.requirements?.currently_due?.length > 0,
        requirements: account.requirements?.currently_due || [],
        lastChecked: new Date()
      };

      const previousStatus = this.accountStatuses.get(accountId);
      this.accountStatuses.set(accountId, newStatus);

      // Check for status changes
      if (previousStatus) {
        if (previousStatus.isActive && !newStatus.isActive) {
          this.emit('account_deactivated', { accountId, userId });
          await this.handleAccountDeactivation(accountId, userId);
        }
        if (!previousStatus.isActive && newStatus.isActive) {
          this.emit('account_activated', { accountId, userId });
        }
        if (!previousStatus.requiresAttention && newStatus.requiresAttention) {
          this.emit('requirements_needed', { accountId, userId, requirements: newStatus.requirements });
          await this.handleRequirementsNeeded(accountId, userId, newStatus.requirements);
        }
      }

      return newStatus;
    } catch (error) {
      if (error.code === 'account_invalid') {
        await this.handleInvalidAccount(accountId, userId);
      }
      throw error;
    }
  }

  private async handleAccountDeactivation(accountId: string, userId?: number) {
    if (!userId) return;

    try {
      // Create a new account link for reactivation
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.APP_URL}/stripe/refresh`,
        return_url: `${process.env.APP_URL}/stripe/return`,
        type: 'account_onboarding',
      });

      // Update user record
      await storage.updateUser(userId, {
        stripeConnectAccountStatus: 'deactivated',
        stripeConnectReactivationUrl: accountLink.url
      });

      // Notify through the app
      await storage.createNotification({
        userId,
        type: 'stripe_account_deactivated',
        title: 'Action Required: Stripe Account Deactivated',
        message: 'Your Stripe account requires attention to continue receiving payments.',
        actionUrl: accountLink.url
      });
    } catch (error) {
      console.error('Error handling account deactivation:', error);
      this.emit('error', { type: 'deactivation_handler', accountId, error });
    }
  }

  private async handleRequirementsNeeded(accountId: string, userId: number | undefined, requirements: string[]) {
    if (!userId) return;

    try {
      // Create an account link for updating requirements
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.APP_URL}/stripe/refresh`,
        return_url: `${process.env.APP_URL}/stripe/return`,
        type: 'account_update',
      });

      // Update user record
      await storage.updateUser(userId, {
        stripeConnectAccountStatus: 'action_required',
        stripeConnectUpdateUrl: accountLink.url
      });

      // Send notification
      await storage.createNotification({
        userId,
        type: 'stripe_account_update_required',
        title: 'Action Required: Stripe Account Update Needed',
        message: `Please update your Stripe account information: ${requirements.join(', ')}`,
        actionUrl: accountLink.url
      });
    } catch (error) {
      console.error('Error handling requirements needed:', error);
      this.emit('error', { type: 'requirements_handler', accountId, error });
    }
  }

  private async handleInvalidAccount(accountId: string, userId?: number) {
    if (!userId) return;

    try {
      // Reset the user's Stripe connection
      await storage.updateUser(userId, {
        stripeConnectAccountId: null,
        stripeConnectAccountStatus: 'invalid',
        stripeConnectReactivationUrl: null,
        stripeConnectUpdateUrl: null
      });

      // Create notification
      await storage.createNotification({
        userId,
        type: 'stripe_account_invalid',
        title: 'Stripe Account Invalid',
        message: 'Your Stripe account is no longer valid. Please set up a new account to continue receiving payments.',
        actionUrl: '/dashboard/payments'
      });

      this.accountStatuses.delete(accountId);
      this.emit('account_invalid', { accountId, userId });
    } catch (error) {
      console.error('Error handling invalid account:', error);
      this.emit('error', { type: 'invalid_account_handler', accountId, error });
    }
  }

  public getAccountStatus(accountId: string): StripeAccountStatus | undefined {
    return this.accountStatuses.get(accountId);
  }

  public async requestAccountUpdate(accountId: string): Promise<string> {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.APP_URL}/stripe/refresh`,
        return_url: `${process.env.APP_URL}/stripe/return`,
        type: 'account_update'
      });
      return accountLink.url;
    } catch (error) {
      console.error('Error creating account update link:', error);
      throw error;
    }
  }
}
