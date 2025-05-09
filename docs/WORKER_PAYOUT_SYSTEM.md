# Worker Payout System

This document explains how the worker payout system works in the gig economy platform, including how funds flow from job posters to workers.

## Architecture Overview

The worker payout system uses Stripe Connect to manage payments between job posters (customers) and workers (service providers).

```
Job Poster → Stripe Customer → Platform Account → Stripe Connect → Worker
```

## Payment Flow

1. **Initial Payment**: Job posters pay for jobs using their credit card via Stripe.
2. **Platform Processing**: Funds are received in the platform's Stripe account.
3. **Worker Payout**: Funds are transferred to workers via Stripe Connect transfers.

## Key Components

### 1. Earning Records

Earning records track money owed to workers:

- **Status Progression**: `pending` → `approved` → `paid`
- **Database Fields**:
  - `id`: Unique identifier
  - `workerId`: Worker who earned the money
  - `jobId`: Associated job
  - `amount`: Dollar amount
  - `status`: Current status
  - `transferId`: Stripe transfer ID (when paid)
  - `description`: Payment description

### 2. Worker Connect Accounts

Each worker must have a Stripe Connect account:

- **Account Creation**: Workers create Connect accounts during onboarding
- **Required Capabilities**: The `transfers` capability must be enabled
- **Account Status**: Must be `active` to receive transfers

### 3. Payout Handler

The payout handler processes transfers to workers:

- **Single Payout**: `processWorkerPayout(earningId)` - Process one earning
- **Bulk Processing**: `processAllPendingPayoutsForWorker(workerId)` - Process all for one worker
- **Platform-wide Processing**: `processAllPendingPayouts()` - Process all pending earnings

### 4. API Endpoints

Available endpoints for payout operations:

- **`POST /api/payments/worker-payout/:earningId`** - Admin only
- **`POST /api/payments/worker/:workerId/process-payouts`** - Admin only
- **`POST /api/payments/process-all-payouts`** - Admin only
- **`POST /api/payments/request-payout`** - Worker can request their own payout

## Setup Requirements

1. **Stripe Account**: Platform must have a Stripe account with Connect capability
2. **API Keys**: `STRIPE_SECRET_KEY` must be configured
3. **Worker Accounts**: All workers must complete Stripe Connect onboarding
4. **Platform Funds**: Platform account must have sufficient funds to cover transfers

## Testing

The test scripts demonstrate the payout flow:

- `server/tests/test-payout-flow.ts`: Tests the payout handling functions
- Expected outcome: Successful transfers to worker Connect accounts

## Admin Dashboard (Future Development)

The admin dashboard will provide:

- Pending earnings overview
- Transfer history
- Worker account statuses
- Manual payout controls

## Notifications

Workers receive notifications at these key points:

1. When a job is completed and earnings are created
2. When earnings are approved for payout
3. When the payout is successfully transferred

## Troubleshooting

Common issues and their solutions:

1. **Failed Transfers**: Check worker's Connect account status and capabilities
2. **Insufficient Funds**: Ensure platform Stripe account has sufficient balance
3. **Account Verification**: Workers must complete all verification steps in Stripe Connect

## Connect Account Requirements

Workers' Stripe Connect accounts must have:

1. Complete identity verification
2. Bank account details
3. Accepted terms of service
4. `transfers` capability with `active` status