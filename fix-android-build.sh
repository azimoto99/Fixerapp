#!/bin/bash

echo "===== Fixer App - Android Build Fix ====="

# Check if the android directory exists
if [ ! -d "android" ]; then
  echo "Creating android directory structure..."
  mkdir -p android
fi

# Create Capacitor settings file
echo "Creating capacitor.settings.gradle..."
cat > capacitor.settings.gradle << EOL
// Capacitor settings for Gradle
// This file is referenced in the android/settings.gradle

// Include Capacitor Android as a dependency if present
includeIfExists = { path ->
  if (file(path).exists()) {
    include path
    return true
  }
  return false
}

// Include Capacitor Android
def capacitorPath = '../node_modules/@capacitor/android/capacitor'
if (file(capacitorPath).exists()) {
  include ':capacitor-android'
  project(':capacitor-android').projectDir = new File(capacitorPath)
}
EOL

# Update .gitignore to handle native folders properly
echo "Updating .gitignore for native directories..."
if [ -f ".gitignore" ]; then
  # Check if android and ios are already in .gitignore
  if ! grep -q "^/android$" .gitignore; then
    echo "" >> .gitignore
    echo "# Native build folders" >> .gitignore
    echo "/android" >> .gitignore
    echo "/ios" >> .gitignore
  fi
fi

# Create app.config.js that ignores native directories in production
echo "Creating app.config.js for proper Expo config..."
cat > app.config.js << EOL
// Dynamic Expo config
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = ({ config }) => {
  // Get configuration from app.json
  const appConfig = { ...config };
  
  // For production builds where we use EAS, make sure we don't
  // have conflicts with native projects
  if (process.env.EAS_BUILD_PLATFORM) {
    // Remove properties that would be managed by the native project
    delete appConfig.orientation;
    delete appConfig.icon;
    delete appConfig.userInterfaceStyle;
    delete appConfig.splash;
    delete appConfig.ios;
    delete appConfig.android;
    delete appConfig.scheme;
    delete appConfig.primaryColor;
    delete appConfig.notification;
    delete appConfig.plugins;
  }
  
  return withAndroidManifest(appConfig, config => {
    return config;
  });
};
EOL

echo "===== Android build fixes complete ====="
echo "You can now build your Android app using:"
echo "eas build --platform android --profile simpleBuild"