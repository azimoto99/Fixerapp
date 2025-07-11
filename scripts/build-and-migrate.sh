#!/bin/bash

# Build and migrate script for Render deployment
# This combines the build and database migration steps

set -e  # Exit on any error

echo "🚀 Starting build and migration process..."

# Check if we're in Render environment
if [ -n "$RENDER" ]; then
  echo "✅ Running in Render environment"
  export NODE_ENV=production
else
  echo "ℹ️  Running in local environment"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Run database migrations first
echo "🗄️  Running database migrations..."
npm run db:push

echo "✅ Database migrations completed"

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Build completed successfully"

echo "🎉 Build and migration process completed!"