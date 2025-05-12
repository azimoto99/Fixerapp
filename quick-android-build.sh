#!/bin/bash

echo "=====================================
Fixer - Quick Android Sync Script 
=====================================
This script prepares the Android project without building the full APK
"

# Create placeholder Android SDK if needed
if [ -z "$ANDROID_SDK_ROOT" ]; then
  export ANDROID_SDK_ROOT="/tmp/android-sdk"
  echo "Using placeholder SDK path: $ANDROID_SDK_ROOT"
  mkdir -p "$ANDROID_SDK_ROOT"
fi

# Build the web app first
echo "Step 1: Building web application..."
npm run build
if [ $? -ne 0 ]; then
  echo "Error: Failed to build web application"
  exit 1
fi
echo "✓ Web build successful"

# Check if the dist/client directory exists
if [ ! -d "dist/client" ]; then
  echo "Error: Web build directory not found at dist/client"
  echo "Checking for other build directories..."
  
  # Try to find the actual build directory
  BUILD_DIR=$(find dist -type d -name "client" 2>/dev/null || find dist -type d 2>/dev/null | grep -v "node_modules" | head -1)
  
  if [ -n "$BUILD_DIR" ] && [ -f "$BUILD_DIR/index.html" ]; then
    echo "Found web build at $BUILD_DIR"
    # Update capacitor config to point to the correct directory
    sed -i "s|webDir:.*|webDir: '$BUILD_DIR',|" capacitor.config.ts
    echo "✓ Updated capacitor.config.ts to use $BUILD_DIR"
  else
    echo "No suitable build directory found. Please check the build script output."
    exit 1
  fi
fi

# Check if Android directory exists and sync it
if [ ! -d "android" ]; then
  echo "Android project not initialized. Setting up now..."
  npx cap add android
  if [ $? -ne 0 ]; then
    echo "Error: Failed to initialize Android project"
    exit 1
  fi
  echo "✓ Android project initialized"
else
  echo "✓ Using existing Android project"
fi

# Copy in the Capacitor config
echo "Syncing web resources to Android..."
npx cap sync android
if [ $? -ne 0 ]; then
  echo "Error: Failed to sync Android project"
  exit 1
fi

echo "✓ Android project sync completed"
echo 
echo "=====================================
Next Steps:
1. The Android project is now ready at ./android/
2. You can use Android Studio to build and run the APK
3. Follow the Android build guide in the documentation
====================================="