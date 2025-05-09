# Payment System Architecture

This document outlines the architecture and components of the payment system in our platform, which enables job posters to pay workers securely through Stripe's payment infrastructure.

## Overview

Our payment system uses Stripe as the payment processor with Stripe Connect to enable direct payments to workers. This architecture provides several benefits:

- Secure handling of payment information
- Compliance with financial regulations
- Direct payouts to workers
- Reduced liability for our platform
- Automatic handling of tax documentation

## Components

### 1. User Types and Accounts

- **Job Posters**: Users who post jobs and make payments
  - Associated with a Stripe Customer ID (`stripeCustomerId`)
  - Can save payment methods for future use

- **Workers**: Users who perform jobs and receive payments
  - Associated with a Stripe Connect Account ID (`stripeConnectAccountId`)
  - Account status tracked via `stripeConnectAccountStatus`

### 2. Database Schema

Key tables related to payments:

- `users`: Contains both the Stripe Customer ID and Connect Account ID fields
- `payments`: Records all payment transactions
- `earnings`: Tracks worker earnings and payout status
- `jobs`: Contains payment details for each job

### 3. Payment Flow

The payment process follows these steps:

1. **Job Creation**: A job poster creates a job with a specified payment amount
2. **Job Completion**: Worker completes the job and marks it as done
3. **Payment Intent**: Platform creates a payment intent via Stripe
4. **Payment Capture**: Job poster's payment method is charged
5. **Transfer**: Funds are transferred to the worker's Connect account
6. **Status Update**: Payment and earning records are updated based on webhooks

### 4. Stripe Connect Implementation

We implement Stripe Connect using the "Standard" account type, which requires:

1. Worker onboarding via Stripe's hosted flow
2. Collection of tax information directly by Stripe 
3. Verification of worker identity by Stripe
4. Direct transfers to worker bank accounts

### 5. Webhooks

The system relies on the following Stripe webhook events:

- `payment_intent.succeeded`: Updates job and payment status when a payment is completed
- `payment_intent.payment_failed`: Handles failed payments
- `transfer.paid`: Updates earning status when a transfer to a worker is completed
- `transfer.failed`: Handles failed transfers to workers
- `account.updated`: Updates Connect account status when changes occur

### 6. Service Fee Model

The platform charges a service fee for each job:

- Standard fee: $2.50 per job
- Additional percentage-based fee for specific job types
- Fees are transparently displayed to both parties
- Net amount (after fees) is calculated and shown to workers

## Security Considerations

- Payment information is never stored on our servers
- All payment processing occurs on Stripe's secure infrastructure
- Stripe Elements is used for secure credit card collection
- Webhook signatures are verified to prevent tampering
- Admin operations require additional authentication

## Testing

Payment functionality can be tested using:

1. Stripe test mode keys
2. Test credit card numbers provided by Stripe
3. Automated test scripts in the `server/tests` directory

## Future Enhancements

- Subscription-based service plans
- Partial payment and milestone-based payment releases
- Bulk payouts for workers with multiple completed jobs
- Enhanced reporting and analytics for payments
- Support for international payments and currencies