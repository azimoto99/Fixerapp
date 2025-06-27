import Stripe from 'stripe';

// Initialize Stripe with secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * Create a new Stripe Connect express account and return onboarding link
 */
export async function createStripeConnectAccount(userId: string): Promise<{ accountId: string; accountLinkUrl: string }> {
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
  return { accountId: account.id, accountLinkUrl: link.url! };
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
  // Create PaymentIntent with application fee
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    payment_method_types: ['card'],
    application_fee_amount: Math.round(amount * 0.05 * 100), // e.g., 5% fee
    metadata: { posterId, workerId, jobId },
    transfer_data: { destination: workerConnectAccountId },
  });
  return { paymentIntentId: paymentIntent.id, clientSecret: paymentIntent.client_secret! };
}

export default stripe;
