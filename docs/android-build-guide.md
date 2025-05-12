# Android Build Guide for Fixer App

This guide explains how to build the Fixer App for Android deployment.

## Prerequisites

- Android SDK installed on your local machine
- JDK 11 or newer
- Node.js and npm installed
- Git to clone the project

## Step 1: Build the Web App

First, build the web application:

```bash
# Clone the repository if you haven't already
git clone https://github.com/your-repo/fixer-app.git
cd fixer-app

# Install dependencies
npm install

# Build the web app
npm run build
```

## Step 2: Set Up Android Project

If you haven't already set up the Android project, run:

```bash
npx cap add android
```

This creates an Android project in the `android` directory.

## Step 3: Update Capacitor Config

Make sure `capacitor.config.ts` is properly configured:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fixerapp.app',
  appName: 'Fixer',
  webDir: 'dist/client', // Make sure this matches your build output directory
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.fixerapp.com'
  },
  // ... other configurations
};

export default config;
```

## Step 4: Sync Web Assets to Android

After building the web app, sync the changes to the Android project:

```bash
npx cap sync android
```

## Step 5: Build the APK

There are two ways to build the APK:

### Option 1: Using Android Studio (Recommended)

1. Open Android Studio
2. Open the `android` directory from your project
3. Connect your device or set up an emulator
4. Click on "Run" or use the green play button

### Option 2: Using Gradle Command Line

From the project root:

```bash
cd android
./gradlew assembleDebug
```

This creates a debug APK at `android/app/build/outputs/apk/debug/app-debug.apk`

For a release build:

```bash
./gradlew assembleRelease
```

**Note:** Release builds require signing configurations.

## Step 6: Testing on a Device

To install the APK on a connected device:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Troubleshooting

### Common Issues and Solutions

1. **Build fails with "SDK not found"**
   - Make sure ANDROID_SDK_ROOT environment variable is set
   - Install Android SDK through Android Studio

2. **Web assets not showing in the app**
   - Check if the `webDir` in capacitor.config.ts matches your build output
   - Make sure you ran `npm run build` before running `npx cap sync`

3. **App crashes on startup**
   - Check Android logs using `adb logcat`
   - Make sure all required plugins are properly installed

4. **White screen after launch**
   - This is often due to missing or incorrect web assets
   - Make sure you've built the web app and synced it to Android

### Additional Commands

- To update plugins: `npx cap update android`
- To open project directly in Android Studio: `npx cap open android`