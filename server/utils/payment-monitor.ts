import { EventEmitter } from 'events';
import { storage } from '../storage';
import Stripe from 'stripe';

interface PaymentMonitorOptions {
  maxRetries?: number;
  retryDelay?: number;
  checkInterval?: number;
}

export class PaymentMonitor extends EventEmitter {
  private stripe: Stripe;
  private maxRetries: number;
  private retryDelay: number;
  private checkInterval: number;
  private pendingPayments: Map<string, number> = new Map();

  constructor(stripe: Stripe, options: PaymentMonitorOptions = {}) {
    super();
    this.stripe = stripe;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000;
    this.checkInterval = options.checkInterval || 30000;
    this.startMonitoring();
  }

  async trackPayment(paymentId: string, userId: number) {
    this.pendingPayments.set(paymentId, userId);
    
    try {
      const payment = await this.stripe.paymentIntents.retrieve(paymentId);
      await this.updatePaymentStatus(paymentId, payment);
    } catch (error) {
      console.error(`Initial payment status check failed for ${paymentId}:`, error);
      this.emit('error', { paymentId, error });
    }
  }

  private async updatePaymentStatus(paymentId: string, payment: Stripe.PaymentIntent) {
    const userId = this.pendingPayments.get(paymentId);
    if (!userId) return;

    try {
      // Get the payment record by transaction ID (Stripe payment intent ID)
      const existingPayment = await storage.getPaymentByTransactionId(paymentId);
      if (!existingPayment) {
        console.error(`Payment not found for paymentId: ${paymentId}`);
        return;
      }

      switch (payment.status) {
        case 'succeeded':
          await storage.updatePaymentStatus(existingPayment.id, 'completed');
          this.pendingPayments.delete(paymentId);
          this.emit('success', { paymentId, userId });
          break;
          
        case 'requires_action':
          this.emit('action_required', { paymentId, userId });
          break;
          
        case 'failed':
          await storage.updatePaymentStatus(existingPayment.id, 'failed' as any);
          this.pendingPayments.delete(paymentId);
          this.emit('failed', { paymentId, userId, reason: payment.last_payment_error?.message });
          break;
      }
    } catch (error) {
      console.error(`Payment status update failed for ${paymentId}:`, error);
      this.emit('error', { paymentId, error });
    }
  }

  private startMonitoring() {
    setInterval(async () => {
      for (const [paymentId, retryCount] of this.pendingPayments.entries()) {
        try {
          const payment = await this.stripe.paymentIntents.retrieve(paymentId);
          await this.updatePaymentStatus(paymentId, payment);
        } catch (error) {
          console.error(`Payment monitoring failed for ${paymentId}:`, error);
          if (retryCount >= this.maxRetries) {
            this.pendingPayments.delete(paymentId);
            this.emit('max_retries_exceeded', { paymentId });
          }
        }
      }
    }, this.checkInterval);
  }

  async retryPayment(paymentId: string) {
    try {
      const payment = await this.stripe.paymentIntents.confirm(paymentId);
      await this.updatePaymentStatus(paymentId, payment);
      return payment;
    } catch (error) {
      console.error(`Payment retry failed for ${paymentId}:`, error);
      this.emit('retry_failed', { paymentId, error });
      throw error;
    }
  }
}
