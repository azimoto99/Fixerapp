#!/bin/bash

echo "🔍 Checking deployment readiness..."

# Check for required environment variables
echo "Checking environment variables..."
MISSING_VARS=0

if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "❌ STRIPE_SECRET_KEY is missing"
  MISSING_VARS=$((MISSING_VARS+1))
else
  echo "✅ STRIPE_SECRET_KEY is set"
fi

if [ -z "$VITE_STRIPE_PUBLIC_KEY" ]; then
  echo "❌ VITE_STRIPE_PUBLIC_KEY is missing"
  MISSING_VARS=$((MISSING_VARS+1))
else
  echo "✅ VITE_STRIPE_PUBLIC_KEY is set"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is missing"
  MISSING_VARS=$((MISSING_VARS+1))
else
  echo "✅ DATABASE_URL is set"
fi

# Check for the existence of essential files
echo "Checking essential files..."
MISSING_FILES=0

if [ ! -f "server/index.ts" ]; then
  echo "❌ server/index.ts is missing"
  MISSING_FILES=$((MISSING_FILES+1))
else
  echo "✅ server/index.ts exists"
fi

if [ ! -f "client/index.html" ]; then
  echo "❌ client/index.html is missing"
  MISSING_FILES=$((MISSING_FILES+1))
else
  echo "✅ client/index.html exists"
fi

# Final assessment
echo ""
if [ $MISSING_VARS -eq 0 ] && [ $MISSING_FILES -eq 0 ]; then
  echo "✅ All checks passed! The application is ready for deployment."
  echo "Run ./deploy-everything.sh to prepare the application for deployment."
else
  echo "❌ $MISSING_VARS environment variables and $MISSING_FILES essential files are missing."
  echo "Please fix these issues before deploying."
fi