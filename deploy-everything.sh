#!/bin/bash
set -e

# Clean up any existing build artifacts
echo "🧹 Cleaning up previous build artifacts..."
rm -rf dist

# Build the client with vite
echo "🔨 Building client application..."
npm run build

# Make sure the server was built correctly
echo "✓ Checking server build..."
ls -la dist

# Create a production start script
echo "📝 Creating production start script..."
cat > start.sh << EOL
#!/bin/bash
NODE_ENV=production node dist/index.js
EOL
chmod +x start.sh

echo "🚀 Deployment preparation completed!"
echo "You can now deploy the application using the Replit UI."