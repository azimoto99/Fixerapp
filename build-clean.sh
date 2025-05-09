#!/bin/bash
set -e

echo "🧹 Cleaning existing build artifacts..."
rm -rf dist build node_modules/.vite

echo "⚙️ Installing dependencies..."
npm ci

echo "🔨 Building the application..."
npm run build

echo "✅ Build completed successfully! Ready for deployment."