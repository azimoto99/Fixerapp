#!/bin/bash

# Predeploy script for Render
# This script runs before deployment to set up the database

set -e  # Exit on any error

echo "🚀 Starting predeploy script..."

# Check if required environment variables are set
if [ -z "$SUPABASE_DATABASE_URL" ]; then
  echo "❌ Error: SUPABASE_DATABASE_URL is not set"
  exit 1
fi

echo "✅ Environment variables check passed"

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm ci
else
  echo "✅ Dependencies already installed"
fi

# Run database migrations/push
echo "🗄️  Running database migrations..."
npm run db:push

echo "✅ Database setup completed"

# Verify the build will work
echo "🔨 Testing build..."
npm run build

echo "✅ Build test passed"

echo "🎉 Predeploy script completed successfully!"