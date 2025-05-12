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