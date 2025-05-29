#!/bin/bash

# Build script for Fixer App deployment

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Please create a .env file with the following variables:"
    echo "STRIPE_SECRET_KEY=your_stripe_secret_key"
    echo "VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key"
    echo "STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret"
    echo "SESSION_SECRET=your_secure_session_secret"
    exit 1
fi

# Build frontend
echo "Building frontend..."
npm run build

# Build backend
echo "Building backend..."
npm run build:server

echo "Build complete!"