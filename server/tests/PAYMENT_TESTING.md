# Payment Testing with Stripe Connect

This directory contains tests for validating the Stripe Connect payment flow implemented in our application. These tests simulate the payment process from job posters to workers, including the creation of payment intents, recording payments in our database, and transferring funds to worker Connect accounts.

## Prerequisites

Before running these tests, ensure you have the following:

1. A valid Stripe account with API keys
2. Stripe Connect configured in your Stripe Dashboard
3. At least one test user with a Stripe Connect account set up
4. Environment variables configured (see below)

## Required Environment Variables

The tests require the following environment variables to be set:

- `STRIPE_SECRET_KEY`: Your Stripe secret key (begins with `sk_`)
- `DATABASE_URL`: Connection string for your PostgreSQL database

## Running the Tests

To run the payment flow test:

```bash
# Run using the provided shell script
./server/tests/run-payment-test.sh

# Or run directly with tsx
npx tsx server/tests/payment-flow-test.ts
```

## What the Tests Do

The payment flow test script (`payment-flow-test.ts`) performs the following steps:

1. Finds a worker with a Stripe Connect account in the database
2. Finds or creates a test job for this worker
3. Creates a payment record for the job
4. Creates a Stripe payment intent for testing
5. Creates a payment record in our database
6. Creates an earning record for the worker
7. Creates a transfer to the worker's Connect account
8. Updates the earning status to "processing"
9. Outputs test results and any errors

## Troubleshooting

If the tests fail, check the following:

1. **Missing API keys**: Ensure your Stripe keys are correctly set in the environment
2. **Connect account issues**: Verify that the worker's Stripe Connect account is properly set up
3. **Database connectivity**: Check that your database connection is working
4. **Invalid data**: Ensure your database has at least one worker with a valid Stripe Connect account ID

## Common Error Messages

- `No worker found with a Stripe Connect account`: You need to set up a Stripe Connect account for at least one worker
- `Transfer failed`: The Connect account may not be fully onboarded or there may be issues with the account

## Webhook Testing

For full end-to-end testing, you'll need to set up Stripe webhooks to test the automatic updates when transfers are completed. Use the Stripe CLI to forward webhook events to your local environment:

```bash
stripe listen --forward-to localhost:5000/webhook/stripe
```