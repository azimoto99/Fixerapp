# Stripe Integration Setup Guide

This guide explains how to set up Stripe integration for our platform, including both regular payments and Stripe Connect for worker payouts.

## Prerequisites

Before you begin, you'll need:

1. A Stripe account (create one at [stripe.com](https://stripe.com))
2. Access to your Stripe Dashboard
3. The ability to set environment variables for the application

## Step 1: Get Your API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Find both your **Publishable Key** (starts with `pk_`) and **Secret Key** (starts with `sk_`)
3. For development, use the test mode keys

## Step 2: Configure Environment Variables

Set the following environment variables:

```
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

The `VITE_STRIPE_PUBLIC_KEY` is used on the client side, while `STRIPE_SECRET_KEY` is used on the server.

## Step 3: Set Up Stripe Connect

To enable direct payments to workers:

1. Go to [Connect Settings](https://dashboard.stripe.com/settings/connect) in your Stripe Dashboard
2. Set up your platform profile with the required information
3. Configure the following settings:
   - Branding: Add your platform logo and colors
   - OAuth settings: Configure your redirect URI (typically `https://yourapp.com/stripe/connect/callback`)
   - Capabilities: Enable "Transfers" and "Standard payouts"

### Important: Worker Connect Account Capabilities

For transfers to work properly, each worker's Connect account must have the proper capabilities enabled:

1. When creating Connect accounts, make sure to request the "transfers" capability
2. Guide workers through the full onboarding process, including:
   - Business details verification
   - Identity verification
   - Bank account setup

If you encounter errors like "Your destination account needs to have at least one of the following capabilities enabled: transfers," this indicates the worker's account onboarding is incomplete. You'll need to:

1. Check the account status via the Stripe Dashboard
2. Provide the worker with their account link to complete the onboarding process
3. Monitor the account status via webhooks to know when they're ready to receive payments

## Step 4: Configure Webhooks

Webhooks are crucial for receiving payment status updates:

1. Go to [Webhooks settings](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL (e.g., `https://yourapp.com/webhook/stripe`)
4. Select the following events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `transfer.paid`
   - `transfer.failed`
   - `account.updated`
5. Save the endpoint and note the signing secret
6. Set the webhook secret as an environment variable:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Step 5: Testing Locally with the Stripe CLI

For local development, use the Stripe CLI to forward webhook events:

1. [Install the Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Log in to your Stripe account:
   ```bash
   stripe login
   ```
3. Forward events to your local server:
   ```bash
   stripe listen --forward-to localhost:5000/webhook/stripe
   ```
4. The CLI will provide a webhook signing secret to use in your local environment

## Step 6: Testing the Integration

Test both the payment and Connect flows:

1. Use Stripe's [test card numbers](https://stripe.com/docs/testing#cards):
   - For successful payments: `4242 4242 4242 4242`
   - For failed payments: `4000 0000 0000 0002`

2. For Connect onboarding, use the provided test data in Stripe's documentation

3. Run our automated tests:
   ```bash
   ./server/tests/run-payment-test.sh
   ```

## Step 7: Going Live

When ready to move to production:

1. Complete Stripe's going live checklist in your dashboard
2. Switch your API keys from test to live (update environment variables)
3. Update webhook endpoints to point to your production URL
4. Perform end-to-end testing with real accounts (small amounts)

## Troubleshooting

Common issues and solutions:

1. **Webhook errors**: Ensure your webhook signature verification is working correctly

2. **Connect account errors**: Make sure workers complete all required onboarding steps

3. **Payment failures**: Check the Stripe dashboard for detailed error messages

4. **API version issues**: Ensure your code matches the Stripe API version you're using

For additional help, refer to the [Stripe documentation](https://stripe.com/docs) or contact support.