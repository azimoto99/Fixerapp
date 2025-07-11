#!/bin/bash

# Robust deployment script with retry logic
# This script handles common deployment issues and retries failed operations

set -e  # Exit on any error

echo "🚀 Starting robust deployment process..."

# Function to retry a command
retry_command() {
    local cmd="$1"
    local max_attempts=3
    local delay=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt/$max_attempts: $cmd"
        
        if eval "$cmd"; then
            echo "✅ Command succeeded on attempt $attempt"
            return 0
        else
            echo "❌ Command failed on attempt $attempt"
            if [ $attempt -lt $max_attempts ]; then
                echo "⏱️  Waiting ${delay}s before retry..."
                sleep $delay
                delay=$((delay * 2))  # Exponential backoff
            fi
            attempt=$((attempt + 1))
        fi
    done
    
    echo "❌ Command failed after $max_attempts attempts"
    return 1
}

# Check environment
if [ -n "$RENDER" ]; then
    echo "✅ Running in Render environment"
    export NODE_ENV=production
else
    echo "ℹ️  Running in local environment"
fi

# Install dependencies with retry
echo "📦 Installing dependencies..."
retry_command "npm ci --production=false"

# Database operations with retry
echo "🗄️  Running database operations..."
retry_command "npm run db:push"

# Build with retry
echo "🔨 Building application..."
retry_command "npm run build"

echo "🎉 Deployment completed successfully!"

# Optional: Test that the build artifacts exist
if [ -d "dist" ]; then
    echo "✅ Build artifacts found in dist/"
    ls -la dist/
else
    echo "⚠️  Warning: dist/ directory not found"
fi

# Optional: Check if server files exist
if [ -f "dist/index.js" ]; then
    echo "✅ Server build found: dist/index.js"
else
    echo "⚠️  Warning: Server build not found"
fi

echo "🚀 Ready for deployment!"