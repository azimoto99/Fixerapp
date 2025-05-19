#!/bin/bash

echo "===== Fixer App - Clear Capacitor and Setup Pure Expo Build ====="

# If android directory exists, remove it
if [ -d "android" ]; then
  echo "Removing existing android directory..."
  rm -rf android
fi

# If ios directory exists, remove it
if [ -d "ios" ]; then
  echo "Removing existing ios directory..."
  rm -rf ios
fi

# Modify app.json to remove Capacitor dependencies
echo "Modifying app.json to remove Capacitor configuration..."

# Create a backup of app.json
cp app.json app.json.bak

# Update app.json to remove any Capacitor-specific configurations
cat > app.json << EOL
{
  "expo": {
    "name": "Fixer",
    "slug": "fixer",
    "owner": "azimoto9",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./attached_assets/ChatGPT_Image_May_7__2025__01_30_03_AM-removebg-preview.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./attached_assets/ChatGPT_Image_May_7__2025__01_31_24_AM-removebg-preview.png",
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.fixer"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./attached_assets/ChatGPT_Image_May_7__2025__01_30_03_AM-removebg-preview.png",
        "backgroundColor": "#000000"
      },
      "package": "com.fixer",
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"
      ]
    },
    "web": {
      "favicon": "./attached_assets/ChatGPT_Image_May_7__2025__01_30_03_AM-removebg-preview.png"
    },
    "scheme": "fixerapp",
    "extra": {
      "eas": {
        "projectId": "c2dd5237-478c-4d38-b4c7-74054caed1f2"
      }
    },
    "primaryColor": "#68D391",
    "notification": {
      "icon": "./attached_assets/ChatGPT_Image_May_7__2025__01_30_03_AM-removebg-preview.png",
      "color": "#000000",
      "androidMode": "default"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    },
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 33,
            "targetSdkVersion": 33,
            "buildToolsVersion": "33.0.0"
          },
          "ios": {
            "deploymentTarget": "15.1"
          }
        }
      ]
    ]
  }
}
EOL

# Create Expo-specific entrypoint if not exists
if [ ! -f "App.js" ] || ! grep -q "registerRootComponent" "App.js"; then
  echo "Creating pure Expo entry point..."
  cat > App.js << EOL
import { registerRootComponent } from 'expo';
import App from './client/src/App';

// Register the main component
registerRootComponent(App);
EOL
fi

# Create .gitignore if not exists or update it
if [ ! -f ".gitignore" ]; then
  echo "Creating .gitignore file..."
  cat > .gitignore << EOL
# Expo
.expo/
dist/
web-build/
android/
ios/

# Node
node_modules/
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store

# Build files
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
EOL
else
  # Make sure android and ios are in .gitignore
  if ! grep -q "android/" .gitignore; then
    echo "android/" >> .gitignore
  fi
  if ! grep -q "ios/" .gitignore; then
    echo "ios/" >> .gitignore
  fi
fi

echo "===== Setup Complete ====="
echo "Your app is now configured for pure Expo builds without Capacitor"
echo "Build using: eas build --platform android --profile simpleBuild"