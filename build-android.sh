#!/bin/bash

# Show banner
echo "====================================="
echo "Fixer - Android Build Script"
echo "====================================="
echo "Building Android app package..."
echo

# Check Android SDK environment
if [ -z "$ANDROID_SDK_ROOT" ]; then
  export ANDROID_SDK_ROOT="/usr/lib/android-sdk"
  echo "Setting ANDROID_SDK_ROOT to $ANDROID_SDK_ROOT"
fi

# Check for Android SDK
if [ ! -d "$ANDROID_SDK_ROOT" ]; then
  echo "Error: Android SDK not found at $ANDROID_SDK_ROOT"
  echo "Please install Android SDK before proceeding."
  exit 1
fi

# Create android directory if it doesn't exist
if [ ! -d "android" ]; then
  echo "Android project not initialized. Setting up now..."
  npx cap add android
  if [ $? -ne 0 ]; then
    echo "Error: Failed to initialize Android project"
    exit 1
  fi
  echo "✓ Android project initialized"
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

# Copy web build to Capacitor
echo "Step 2: Syncing files to Android project..."
npx cap sync android
if [ $? -ne 0 ]; then
  echo "Error: Failed to sync with Android project"
  exit 1
fi
echo "✓ Files synced to Android project"
echo

# Update Android project config
echo "Step 3: Updating Android configuration..."
# Create a custom icon resource if it doesn't exist
if [ ! -f "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png" ]; then
  echo "Creating app icon resources..."
  mkdir -p android/app/src/main/res/mipmap-xxxhdpi
  cp public/fixer-pin-logo.svg android/app/src/main/res/drawable/app_icon.xml
fi

# Navigate to the Android directory
echo "Step 4: Building Android APK..."
cd android
ANDROID_HOME=$ANDROID_SDK_ROOT ./gradlew assembleDebug
if [ $? -ne 0 ]; then
  echo "Error: Android build failed"
  exit 1
fi
echo "✓ Android APK build successful"
echo

# Copy APK to project root for easy access
echo "Step 5: Copying APK to project root..."
cp app/build/outputs/apk/debug/app-debug.apk ../fixer-app.apk
if [ $? -ne 0 ]; then
  echo "Error: Failed to copy APK file"
  exit 1
fi
echo "✓ APK created at ./fixer-app.apk"
echo

# Done
echo "====================================="
echo "Build Complete!"
echo "====================================="
echo "Your Android APK is ready at:"
echo "./fixer-app.apk"
echo
echo "Install this file on your Android device to use the Fixer app."
echo

# Provide options to the user
echo "What would you like to do next?"
echo "1. Exit"
echo "2. Open Android project in Android Studio (if available)"
echo "3. Create QR code for downloading the APK"
read -p "Enter option (1-3): " option

case $option in
  2)
    echo "Opening Android project in Android Studio..."
    cd ..
    npx cap open android
    ;;
  3)
    echo "Creating QR code for APK download..."
    cd ..
    node url-qr.js "$(pwd)/fixer-app.apk"
    ;;
  *)
    echo "Build finished. Exiting."
    ;;
esac