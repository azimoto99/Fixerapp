#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status

# Display build information
echo "===== Starting Fixer App Build Process ====="
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Build time: $(date)"
echo "=======================================\n"

# Ensure dist directory exists and is clean
echo "Creating clean dist directory..."
rm -rf dist
mkdir -p dist

# Build the frontend with Vite with increased memory limit
echo "\n===== Building frontend with Vite ====="
export NODE_OPTIONS="--max-old-space-size=4096"
npx vite build --outDir dist/client

# Copy static assets if needed
echo "\n===== Copying static assets ====="
if [ -d "public" ]; then
  cp -r public/* dist/client/ 2>/dev/null || echo "No public assets to copy"
fi

# Build the backend with esbuild in CommonJS format
echo "\n===== Building backend with esbuild ====="
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=cjs \
  --outdir=dist \
  --minify \
  --sourcemap

# Create a production .env file template
echo "\n===== Creating environment file template ====="
cat > dist/.env.example << EOL
# Required environment variables for production
DATABASE_URL=your_postgres_connection_string
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NODE_ENV=production
PORT=5000
SESSION_SECRET=your_secure_session_secret
EOL

# Copy the run-production.js file to the dist directory
echo "\n===== Copying production launcher ====="
cp run-production.js dist/

# Copy package.json (only with production dependencies)
echo "\n===== Creating production package.json ====="
node -e "
const pkg = require('./package.json');
const newPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  main: 'index.js',
  scripts: {
    start: 'node run-production.js'
  },
  dependencies: pkg.dependencies,
  engines: {
    node: '>=18'
  }
};
require('fs').writeFileSync('dist/package.json', JSON.stringify(newPkg, null, 2));
"

echo "\n===== Build complete! ====="
echo "Files are in the dist directory."
echo "Run 'node dist/run-production.js' to start the application in production mode."
echo "=======================================\n"