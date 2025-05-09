#!/bin/bash

# This script helps verify that your Stripe API keys are correctly set up
# It will check both the Secret and Publishable keys and perform basic API calls

echo "==================================================="
echo "Stripe Setup Verification"
echo "==================================================="

# Check environment variables
echo "Checking environment variables..."

if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "❌ ERROR: STRIPE_SECRET_KEY is not set"
  echo "   Please set your Stripe secret key (starts with sk_)"
  have_errors=true
else
  # Check if it starts with sk_
  if [[ $STRIPE_SECRET_KEY == sk_* ]]; then
    echo "✓ STRIPE_SECRET_KEY is set correctly"
  else
    echo "❌ ERROR: STRIPE_SECRET_KEY does not start with 'sk_'"
    echo "   Please check your key format"
    have_errors=true
  fi
fi

if [ -z "$VITE_STRIPE_PUBLIC_KEY" ]; then
  echo "❌ ERROR: VITE_STRIPE_PUBLIC_KEY is not set"
  echo "   Please set your Stripe publishable key (starts with pk_)"
  have_errors=true
else
  # Check if it starts with pk_
  if [[ $VITE_STRIPE_PUBLIC_KEY == pk_* ]]; then
    echo "✓ VITE_STRIPE_PUBLIC_KEY is set correctly"
  else
    echo "❌ ERROR: VITE_STRIPE_PUBLIC_KEY does not start with 'pk_'"
    echo "   Please check your key format"
    have_errors=true
  fi
fi

# Exit if we have errors with environment variables
if [ "$have_errors" = true ]; then
  echo
  echo "Please fix the above errors before continuing."
  echo "See docs/STRIPE_SETUP.md for more information."
  echo "==================================================="
  exit 1
fi

# Test API connection
echo
echo "Testing Stripe API connection..."

# Try a simple API call using curl
response=$(curl -s -f -X GET \
  "https://api.stripe.com/v1/balance" \
  -H "Authorization: Bearer $STRIPE_SECRET_KEY")

if [ $? -eq 0 ]; then
  echo "✓ Successfully connected to Stripe API"
else
  echo "❌ ERROR: Failed to connect to Stripe API"
  echo "   Please check your STRIPE_SECRET_KEY"
  echo
  echo "Please see docs/STRIPE_SETUP.md for more information."
  echo "==================================================="
  exit 1
fi

echo
echo "✅ Stripe setup verification passed!"
echo "==================================================="