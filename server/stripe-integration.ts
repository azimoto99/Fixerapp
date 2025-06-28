import Stripe from 'stripe';

// Initialize Stripe with secret key from environment
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Error handling wrapper for Stripe API calls
async function handleStripeError<T>(operation: () => Promise<T>, context: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error(`Stripe ${context} error:`, error.message, error.type, error.code);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
    console.error(`Unexpected error in ${context}:`, error);
    throw new Error(`Payment system error: ${context} failed`);
  }
}

/**
 * Create a new Stripe Connect express account and return onboarding link
 */
export async function createStripeConnectAccount(userId: string): Promise<{ accountId: string; accountLinkUrl: string }> {
  return handleStripeError(async () => {
    const account = await stripe.accounts.create({
      type: 'express',
      metadata: { userId },
    });
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.APP_URL}/onboard/refresh`,
      return_url: `${process.env.APP_URL}/dashboard`,
      type: 'account_onboarding',
    });
    if (!link.url) {
      throw new Error('Failed to create Stripe account onboarding link: URL not provided');
    }
    return { accountId: account.id, accountLinkUrl: link.url };
  }, 'Connect account creation');
}

/**
 * Update representative details on a Stripe Connect account via Stripe API
 */
export async function updateStripeAccountRepresentative(
  connectAccountId: string,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dob: { day: number; month: number; year: number };
    address: Stripe.AddressParam;
    ssnLast4: string;
  }
): Promise<Stripe.Response<Stripe.Account>> {
  return handleStripeError(async () => {
    return stripe.accounts.update(connectAccountId, {
      individual: {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        dob: data.dob,
        address: data.address,
        ssn_last_4: data.ssnLast4,
      },
    });
  }, 'Account representative update');
}

/**
 * Process payment for a job: create payment intent and transfer
 */
export async function processJobPayment(
  posterId: string,
  workerId: string,
  amount: number,
  jobId: string,
  workerConnectAccountId: string
): Promise<{ paymentIntentId: string; clientSecret: string }> {
  return handleStripeError(async () => {
    // Create PaymentIntent with application fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      payment_method_types: ['card'],
      application_fee_amount: Math.round(amount * 0.05 * 100), // e.g., 5% fee
      metadata: { posterId, workerId, jobId },
      transfer_data: { destination: workerConnectAccountId },
    });
    if (!paymentIntent.client_secret) {
      throw new Error('Failed to create payment intent: client secret not provided by Stripe');
    }
    return { paymentIntentId: paymentIntent.id, clientSecret: paymentIntent.client_secret };
  }, 'Payment intent creation');
}

export default stripe;
