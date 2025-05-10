#!/bin/bash

# Make script executable with chmod +x setup-expo.sh

# Initialize Expo project with current directory
echo "Initializing Expo configuration..."

# Install necessary dependencies
echo "Installing Expo dependencies..."
npm install --legacy-peer-deps expo expo-cli @expo/webpack-config expo-dev-client expo-updates

# Create basic structure for Expo
mkdir -p ./assets

# Copy any existing assets to Expo directory
if [ -d "./attached_assets" ]; then
  cp -r ./attached_assets/* ./assets/
fi

# Set up app entry point for Expo
echo "Creating App entry point for Expo..."
cat > ./App.js << 'EOF'
import { registerRootComponent } from 'expo';
import App from './client/src/App';

// Register the main component
registerRootComponent(App);
EOF

# Create metro config
echo "Creating Metro config for Expo..."
cat > ./metro.config.js << 'EOF'
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
EOF

echo "✅ Expo setup complete!"
echo "Run 'npx expo start' to launch the Expo development server"
echo "Use 'npx expo start --android' to run on Android emulator or device"
echo "Use 'npx expo start --web' to run on web"