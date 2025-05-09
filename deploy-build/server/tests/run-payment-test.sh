#!/bin/bash

# Run the payment flow test script
# This script ensures the Stripe payment flow through Connect accounts works as expected

echo "==================================================="
echo "Running Stripe Connect Payment Test"
echo "==================================================="

# Check if the STRIPE_SECRET_KEY environment variable is set
if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "Error: STRIPE_SECRET_KEY environment variable is not set"
  echo "Please ensure you've added your Stripe secret key to the environment"
  exit 1
fi

# Make the script executable
chmod +x server/tests/payment-flow-test.ts

# Run the TypeScript test file
echo "Starting payment test..."
npx tsx server/tests/payment-flow-test.ts

echo
echo "Test execution completed"
echo "==================================================="