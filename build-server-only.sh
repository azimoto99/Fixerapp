#!/bin/bash
set -e

echo "🔨 Building the server component only..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
echo "🔍 Building health check script..."
esbuild server/health-check.js --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "📋 Creating package.json for production..."
cat > dist/package.json << EOL
{
  "name": "rest-express-server",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
EOL

echo "🔄 Creating startup scripts..."
chmod +x start.sh
chmod +x health-monitor.sh
mkdir -p dist/scripts
cp start.sh dist/scripts/
cp health-monitor.sh dist/scripts/

echo "✅ Server build completed successfully! Ready for deployment."