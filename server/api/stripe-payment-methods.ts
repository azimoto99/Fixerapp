import express from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { isAuthenticated } from '../middleware/auth';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' as any, // Using a valid API version, casting to any to bypass typechecking
});

export const setupStripePaymentMethodsRoutes = (app: express.Express) => {

  // Get current user's Stripe customer ID or create one if it doesn't exist
  const getOrCreateStripeCustomer = async (userId: number) => {
    try {
      // Get user from database
      const user = await storage.getUser(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // If user already has a Stripe customer ID, return it
      if (user.stripeCustomerId) {
        return user.stripeCustomerId;
      }
      
      // Otherwise, create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.fullName || user.username,
        metadata: {
          userId: userId.toString(),
        },
      });
      
      // Save the new Stripe customer ID to the user
      await storage.updateUser(userId, {
        stripeCustomerId: customer.id,
      });
      
      return customer.id;
    } catch (error) {
      console.error('Error getting or creating Stripe customer:', error);
      throw error;
    }
  };

  // Create a SetupIntent for adding a new payment method
  app.post('/api/stripe/create-setup-intent', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User ID is missing' });
      }
      const stripeCustomerId = await getOrCreateStripeCustomer(userId);
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        usage: 'off_session',
      });
      return res.status(200).json({ clientSecret: setupIntent.client_secret });
    } catch (error) {
      console.error('Error creating setup intent:', error);
      return res.status(500).json({
        message: 'Failed to create setup intent',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get all payment methods for the current user
  app.get('/api/stripe/payment-methods', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID is missing' });
      }
      
      const stripeCustomerId = await getOrCreateStripeCustomer(userId);
      
      // Get all payment methods for this customer
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
      });
      
      // Get customer to determine default payment method
      const customer = (await stripe.customers.retrieve(stripeCustomerId)) as Stripe.Customer;
      const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;
      
      // Mark the default payment method
      const data = paymentMethods.data.map(method => ({
        ...method,
        isDefault: method.id === defaultPaymentMethodId,
      }));
      
      return res.status(200).json({
        data,
        total: paymentMethods.data.length,
      });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return res.status(500).json({
        message: 'Failed to fetch payment methods',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Add a new payment method for the current user
  app.post('/api/stripe/payment-methods', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { paymentMethodId } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID is missing' });
      }
      
      if (!paymentMethodId) {
        return res.status(400).json({ message: 'Payment method ID is required' });
      }
      
      const stripeCustomerId = await getOrCreateStripeCustomer(userId);
      
      // Attach the payment method to the customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });
      
      // If this is the first payment method, set it as the default
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
      });
      
      if (paymentMethods.data.length === 1) {
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }
      
      return res.status(200).json({
        message: 'Payment method added successfully',
        paymentMethodId,
      });
    } catch (error) {
      console.error('Error adding payment method:', error);
      return res.status(500).json({
        message: 'Failed to add payment method',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Delete a payment method for the current user
  app.delete('/api/stripe/payment-methods/:paymentMethodId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { paymentMethodId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID is missing' });
      }
      
      if (!paymentMethodId) {
        return res.status(400).json({ message: 'Payment method ID is required' });
      }
      
      const stripeCustomerId = await getOrCreateStripeCustomer(userId);
      
      // Get customer to check if we're deleting the default payment method
      const customer = (await stripe.customers.retrieve(stripeCustomerId)) as Stripe.Customer;
      
      // Get all payment methods for this customer
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
      });
      
      // Check if the payment method belongs to this customer
      const paymentMethodBelongsToCustomer = paymentMethods.data.some(
        method => method.id === paymentMethodId
      );
      
      if (!paymentMethodBelongsToCustomer) {
        return res.status(403).json({
          message: 'Payment method does not belong to this customer',
        });
      }
      
      // Detach the payment method from the customer
      await stripe.paymentMethods.detach(paymentMethodId);
      
      // If we deleted the default payment method, set a new one if available
      if (
        customer.invoice_settings?.default_payment_method === paymentMethodId &&
        paymentMethods.data.length > 1
      ) {
        // Find another payment method that isn't the one we're deleting
        const newDefaultMethod = paymentMethods.data.find(
          method => method.id !== paymentMethodId
        );
        
        if (newDefaultMethod) {
          await stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
              default_payment_method: newDefaultMethod.id,
            },
          });
        }
      }
      
      return res.status(200).json({
        message: 'Payment method removed successfully',
      });
    } catch (error) {
      console.error('Error removing payment method:', error);
      return res.status(500).json({
        message: 'Failed to remove payment method',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Set a payment method as the default for the current user
  app.post('/api/stripe/payment-methods/default', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { paymentMethodId } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID is missing' });
      }
      
      if (!paymentMethodId) {
        return res.status(400).json({ message: 'Payment method ID is required' });
      }
      
      const stripeCustomerId = await getOrCreateStripeCustomer(userId);
      
      // Get all payment methods for this customer
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
      });
      
      // Check if the payment method belongs to this customer
      const paymentMethodBelongsToCustomer = paymentMethods.data.some(
        method => method.id === paymentMethodId
      );
      
      if (!paymentMethodBelongsToCustomer) {
        return res.status(403).json({
          message: 'Payment method does not belong to this customer',
        });
      }
      
      // Set the payment method as the default
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      
      return res.status(200).json({
        message: 'Default payment method updated successfully',
      });
    } catch (error) {
      console.error('Error setting default payment method:', error);
      return res.status(500).json({
        message: 'Failed to set default payment method',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Alias default route to match client-side set-default path
  app.post('/api/stripe/payment-methods/:paymentMethodId/set-default', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { paymentMethodId } = req.params;
      if (!userId) {
        return res.status(401).json({ message: 'User ID is missing' });
      }
      const stripeCustomerId = await getOrCreateStripeCustomer(userId);
      // Verify ownership
      const methods = await stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card' });
      if (!methods.data.some(m => m.id === paymentMethodId)) {
        return res.status(403).json({ message: 'Payment method does not belong to this customer' });
      }
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      return res.status(200).json({ message: 'Default payment method updated successfully' });
    } catch (error) {
      console.error('Error setting default payment method (alias):', error);
      return res.status(500).json({
        message: 'Failed to set default payment method',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};