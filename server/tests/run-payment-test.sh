#!/bin/bash
# This script runs the payment flow test to verify Stripe Connect payments to workers

echo "Running Stripe Connect payment flow test..."
npx tsx server/tests/payment-flow-test.ts