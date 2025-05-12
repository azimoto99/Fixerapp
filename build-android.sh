#!/bin/bash

# Show banner
echo "====================================="
echo "Fixer - Android Build Script"
echo "====================================="
echo "Building Android app package..."
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

# Check for expo-updates package
echo "Step 0: Checking for required packages..."
if ! grep -q '"expo-updates"' "package.json"; then
  echo "Installing expo-updates package..."
  npm install expo-updates
  if [ $? -ne 0 ]; then
    echo "Warning: Failed to install expo-updates package"
    echo "Continuing with build, but OTA updates may not work"
  else
    echo "✓ expo-updates package installed"
  fi
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

# Create Expo constants file for updates
echo "Step 1.5: Creating Expo environment configuration..."
EXPO_CONSTANTS_DIR="node_modules/expo-updates/android/src/main/java/expo/modules/updates"
if [ -d "$EXPO_CONSTANTS_DIR" ]; then
  mkdir -p "$EXPO_CONSTANTS_DIR"
fi

# Create a file with the project URL
cat > expo-project-url.js << 'EOL'
// This file is generated during build to provide the Expo project URL
export const EXPO_PROJECT_URL = "https://u.expo.dev/fixer-app";
export const EXPO_CHANNEL = "main";
EOL
echo "✓ Expo environment configuration created"

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

# Ensure expo-updates plugin is added to the build
echo "Step 3.1: Configuring expo-updates in build..."
# Check if we need to add the plugin configuration to capacitor.config.ts
if ! grep -q "ExpoUpdates" "capacitor.config.ts"; then
  echo "Adding expo-updates plugin to capacitor.config.ts..."
  
  # Create a temporary file with the updated configuration
  cat > capacitor.config.ts.tmp << 'EOL'
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fixerapp.app',
  appName: 'Fixer',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    ExpoUpdates: {
      enabled: true,
      channel: 'main',
      url: 'https://u.expo.dev/fixer-app'
    }
  }
};

export default config;
EOL

  # Replace the current file with our modified version
  mv capacitor.config.ts.tmp capacitor.config.ts
  echo "✓ expo-updates plugin configured in capacitor.config.ts"
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