# Payment System Testing Guide

This guide will help you test the platform's payment system end-to-end, from job posters making payments to workers receiving funds through Stripe Connect.

## Prerequisites

1. Stripe account set up with:
   - API keys configured in environment variables
   - Connect platform settings completed
   - Test mode enabled

2. User accounts:
   - Job poster with Stripe Customer ID
   - Worker with Stripe Connect account

## Test Flow Overview

The payment flow follows these steps:

1. Job poster creates a job with payment details
2. Worker is assigned to the job
3. Job poster makes payment through Stripe
4. Platform creates payment records and earning records
5. Funds are transferred to worker's Connect account
6. Notifications are sent to relevant parties

## Testing with Scripts

We've created several test scripts to validate different parts of the payment system:

### Basic Payment Flow Test

Run the standard payment flow test:

```bash
cd server && tsx tests/payment-flow-test.ts
```

This script:
- Finds a worker with a Connect account
- Creates a test job
- Simulates payment from a job poster
- Attempts to transfer funds to the worker

### Testing with Specific Workers

To test with a specific worker (e.g., one with verified capabilities):

```bash
cd server && tsx tests/payment-flow-test-with-azi.ts
```

## Common Testing Issues

### Issue: "Destination account needs capabilities enabled"

**Error:**
```
Transfer failed: Your destination account needs to have at least one of the following capabilities enabled: transfers, crypto_transfers, legacy_payments
```

**Resolution:**
1. Check the worker's Connect account status via `tests/complete-connect-onboarding.ts`
2. Ensure the account has completed onboarding
3. Manually enable the "transfers" capability in the Stripe dashboard

### Issue: "Insufficient funds in your Stripe account"

**Error:**
```
Transfer failed: You have insufficient funds in your Stripe account. One likely reason you have insufficient funds is that your funds are automatically being paid out; try enabling manual payouts.
```

**Resolution:**
When testing in Stripe's test mode, this error is expected and can be ignored. In production:

1. Enable manual payouts in the Stripe dashboard
2. Ensure your platform account has sufficient funds for transfers
3. Consider using Stripe's "Destination Charges" flow instead of separate transfers

### Issue: "Livemode requests must be redirected via HTTPS"

**Error:**
```
Error creating account link: Livemode requests must always be redirected via HTTPS.
```

**Resolution:**
This occurs when testing with live API keys but using HTTP URLs. Either:
1. Switch to test mode API keys for development
2. Configure secure HTTPS endpoints for production

## Worker Connect Account Setup

Worker Connect accounts must be properly configured:

1. Complete the onboarding process
2. Enable the "transfers" capability
3. Add external accounts (bank account or debit card)
4. Accept the Stripe Connected Account Agreement
5. Provide all required verification information

## Manual Testing Steps

To test the payment flow manually:

1. Log in as a job poster
2. Create a new job with payment details
3. Log in as a worker and apply to the job
4. Log in as a job poster and accept the worker
5. Complete the job
6. Make payment through the platform
7. Verify worker receives payment in their Connect account

## Webhook Testing

For production, configure webhooks to listen for these events:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `transfer.paid`
- `transfer.failed`
- `account.updated`

Use Stripe CLI to test webhooks locally:

```bash
stripe listen --forward-to localhost:5000/webhook/stripe
```