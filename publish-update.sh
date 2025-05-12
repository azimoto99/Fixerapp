#!/bin/bash

# Show banner
echo "====================================="
echo "Fixer - Publish Expo Update"
echo "====================================="
echo "Publishing updates to Expo..."
echo

# Check if eas-cli is installed
if ! command -v eas &> /dev/null; then
  echo "EAS CLI not found. Installing..."
  npm install -g eas-cli
  if [ $? -ne 0 ]; then
    echo "Error: Failed to install EAS CLI"
    exit 1
  fi
  echo "✓ EAS CLI installed"
else
  echo "✓ EAS CLI already installed"
fi

# Check login status
echo "Checking EAS login status..."
eas whoami &> /dev/null
if [ $? -ne 0 ]; then
  echo "Not logged in to EAS. Please log in:"
  eas login
  if [ $? -ne 0 ]; then
    echo "Error: Failed to log in to EAS"
    exit 1
  fi
  echo "✓ Logged in to EAS"
else
  echo "✓ Already logged in to EAS"
fi

# Build the web app first
echo "Step 1: Building web application..."
npm run build
if [ $? -ne 0 ]; then
  echo "Error: Web build failed"
  exit 1
fi
echo "✓ Web build successful"
echo

# Publish the update
echo "Step 2: Publishing update to Expo..."
eas update --auto
if [ $? -ne 0 ]; then
  echo "Error: Failed to publish update"
  exit 1
fi
echo "✓ Update published successfully"
echo

# Done
echo "====================================="
echo "Update Published!"
echo "====================================="
echo "Your update has been published to Expo."
echo "Users will receive the update when they next open the app."
echo "You can view your updates at: https://expo.dev/accounts/[your-account]/projects/fixer-app/updates"
echo

# Make the script executable
chmod +x publish-update.sh