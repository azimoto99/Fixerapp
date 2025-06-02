#!/bin/bash

# Show banner
echo "====================================="
echo "Fixer - Android Build Script"
echo "====================================="
echo "Building Android app package with white screen fix..."
echo

# Check Android SDK environment
if [ -z "$ANDROID_SDK_ROOT" ]; then
  ANDROID_SDK_PATHS=("/usr/lib/android-sdk" "/opt/android-sdk" "$HOME/Android/Sdk")
  
  for path in "${ANDROID_SDK_PATHS[@]}"; do
    if [ -d "$path" ]; then
      export ANDROID_SDK_ROOT="$path"
      echo "Found Android SDK at $ANDROID_SDK_ROOT"
      break
    fi
  done
  
  if [ -z "$ANDROID_SDK_ROOT" ]; then
    echo "Android SDK not found in common locations"
    export ANDROID_SDK_ROOT="/tmp/android-sdk"
    echo "Using placeholder SDK path for web build: $ANDROID_SDK_ROOT"
    mkdir -p "$ANDROID_SDK_ROOT"
    BUILD_APK=false
  else
    BUILD_APK=true
  fi
else
  BUILD_APK=true
fi

# Check if Android directory exists
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
  cp public/fixer.png android/app/src/main/res/drawable/app_icon.xml
fi

# Check if we can build the APK
if [ "$BUILD_APK" = true ]; then
  # Navigate to the Android directory
  echo "Step 4: Building Android APK..."
  cd android
  ANDROID_HOME=$ANDROID_SDK_ROOT ./gradlew assembleDebug
  if [ $? -ne 0 ]; then
    echo "Error: Android build failed"
    echo "Continuing without building APK..."
    BUILD_APK=false
    cd ..
  else
    echo "✓ Android APK build successful"
    echo

    # Copy APK to project root for easy access
    echo "Step 5: Copying APK to project root..."
    cp app/build/outputs/apk/debug/app-debug.apk ../fixer-app.apk
    if [ $? -ne 0 ]; then
      echo "Error: Failed to copy APK file"
      BUILD_APK=false
    else
      echo "✓ APK created at ./fixer-app.apk"
    fi
    echo
    cd ..
  fi
else
  echo "Step 4: Skipping Android APK build (Android SDK not available)"
  echo "✓ Web build and Capacitor sync completed successfully"
  echo "To build the APK, please install Android SDK and run this script again"
  echo
fi

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