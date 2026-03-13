#!/bin/bash

set -e

echo "====================================="
echo "Fixer - Android Build Script"
echo "====================================="

BUILD_APK=true

if [ -z "$ANDROID_SDK_ROOT" ]; then
  for path in "/usr/lib/android-sdk" "/opt/android-sdk" "$HOME/Android/Sdk"; do
    if [ -d "$path" ]; then
      export ANDROID_SDK_ROOT="$path"
      break
    fi
  done
fi

if [ -z "$ANDROID_SDK_ROOT" ]; then
  BUILD_APK=false
  echo "Android SDK not found. The script will build the web app and sync Capacitor only."
else
  echo "Using Android SDK at $ANDROID_SDK_ROOT"
fi

if [ ! -d "android" ]; then
  echo "Android project not initialized. Adding Capacitor Android..."
  npx cap add android
fi

echo "Building web application..."
npm run build

echo "Syncing web assets into Android..."
npx cap sync android

if [ "$BUILD_APK" = true ]; then
  echo "Building debug APK..."
  cd android
  ANDROID_HOME="$ANDROID_SDK_ROOT" ./gradlew assembleDebug
  cd ..

  APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
  if [ -f "$APK_PATH" ]; then
    cp "$APK_PATH" "./fixer-app.apk"
    echo "APK created at ./fixer-app.apk"
  else
    echo "Gradle finished, but the debug APK was not found at $APK_PATH"
  fi
else
  echo "Capacitor Android project is ready. Open it in Android Studio to build an APK."
fi

echo
echo "Next steps:"
echo "- Open Android Studio with: npx cap open android"
echo "- Or run Gradle manually from the android directory"
