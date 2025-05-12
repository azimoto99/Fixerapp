# Building the Fixer Android App

This guide walks you through the process of building a native Android application from the Fixer web app using Capacitor.

## Prerequisites

Before you begin, ensure you have:

- **Android SDK** installed
- **Java Development Kit (JDK)** version 11 or higher
- **Gradle** build system
- **Node.js** and NPM

## Setup Environment Variables

Ensure your Android SDK is properly configured:

```bash
# Set Android SDK environment variables
export ANDROID_SDK_ROOT=/path/to/your/android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
export PATH=$PATH:$ANDROID_SDK_ROOT/tools
```

## Building Steps

### 1. Using the Build Script (Recommended)

The simplest way to build the Fixer Android application is using our build script:

```bash
# Make the script executable
chmod +x build-android.sh

# Run the build script
./build-android.sh
```

The script will handle all necessary steps and produce an APK file at `./fixer-app.apk`.

### 2. Manual Build Process

If you prefer to build manually or need to customize the process:

#### Step 1: Build the Web App

```bash
# Build the web application
npm run build
```

#### Step 2: Initialize Capacitor (First time only)

```bash
# Add Android platform
npx cap add android
```

#### Step 3: Sync Web Build to Android

```bash
# Sync the built web app to the Android project
npx cap sync android
```

#### Step 4: Update Android Configuration

Edit Android-specific settings in the Capacitor configuration file: `capacitor.config.ts`

#### Step 5: Build the Android APK

```bash
# Navigate to Android project directory
cd android

# Build debug APK
./gradlew assembleDebug

# Build release APK (requires signing configuration)
./gradlew assembleRelease
```

## Release Signing

For production releases, you'll need to sign your APK:

1. Create a keystore file:
   ```bash
   keytool -genkey -v -keystore fixer-release-key.keystore -alias fixer -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Update `android/app/build.gradle` with your signing configuration.

3. Build a signed release APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

## Running on a Device

To install the APK on your device:

1. Enable "Install from Unknown Sources" in your device settings
2. Transfer the APK file to your device
3. Open the file on your device to install

## Troubleshooting

### Common Issues

- **Build Failures**: Check that your Android SDK is correctly installed and environment variables are set.
- **Gradle Issues**: Clear the Gradle cache with `./gradlew clean`.
- **App Crashes**: Check that the web build was correctly synced with `npx cap sync android`.

### Android Studio Integration

For more complex debugging:

1. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```

2. Use Android Studio's debugging tools to identify and fix issues.

## App Store Deployment

To publish to the Google Play Store:

1. Build a signed release APK/AAB
2. Create a Google Play Developer account
3. Create a new application in the Google Play Console
4. Upload your signed APK/AAB
5. Configure store listing, content rating, and pricing
6. Submit for review

---

For further assistance, refer to the [Capacitor Android Documentation](https://capacitorjs.com/docs/android).