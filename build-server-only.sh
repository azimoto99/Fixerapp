#!/bin/bash
set -e

echo "🔨 Building the server component only..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "📋 Creating package.json for production..."
cat > dist/package.json << EOL
{
  "name": "rest-express-server",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  }
}
EOL

echo "✅ Server build completed successfully! Ready for deployment."