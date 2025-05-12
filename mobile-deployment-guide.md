# Fixer App Mobile Deployment Guide

This guide outlines the steps to build and deploy the Fixer mobile application using React Native with Expo and Capacitor.

## Prerequisites

Before starting the mobile build process, ensure you have:

1. Node.js 18+ installed
2. Java Development Kit (JDK) 11 or newer for Android builds
3. Android Studio with Android SDK installed for Android builds
4. Xcode (on macOS) for iOS builds
5. Capacitor CLI installed globally: `npm install -g @capacitor/cli`
6. Expo CLI installed globally: `npm install -g expo-cli`

## Environment Setup

1. **Configure Environment Variables**:
   Create a `.env` file in the project root with the following variables:

   ```
   VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
   API_BASE_URL=https://your-production-api-domain.com
   ```

2. **Update Configuration Files**:
   - Check `capacitor.config.ts` to ensure it points to your production API
   - Verify app name, ID, and version in `app.json`

## Android Deployment

### Building the Android APK

1. **Prepare the build**:
   
   First, ensure your app is configured correctly:
   ```bash
   # Update Capacitor
   npx cap sync android
   ```

2. **Generate a keystore** (only needed once):
   ```bash
   keytool -genkey -v -keystore fixer-app-key.keystore -alias fixer-app -keyalg RSA -keysize 2048 -validity 10000
   ```

3. **Build the APK**:
   ```bash
   # Use the provided build script
   chmod +x build-android.sh && ./build-android.sh
   ```
   
   This script will:
   - Build the React/Vite app
   - Copy the built files to the Android project
   - Use Gradle to build the APK

4. **Find the built APK**:
   The APK will be located at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

### Publishing to Google Play Store

1. Create a new application in the [Google Play Console](https://play.google.com/console/developers)
2. Complete the store listing with app details, screenshots, and marketing materials
3. Upload the signed APK to the production track
4. Complete the content rating questionnaire
5. Set up pricing and distribution
6. Submit for review

## iOS Deployment

### Building for iOS (requires macOS)

1. **Prepare the build**:
   ```bash
   # Update Capacitor
   npx cap sync ios
   ```

2. **Open the Xcode project**:
   ```bash
   npx cap open ios
   ```

3. **Configure signing in Xcode**:
   - Select the project in the Project Navigator
   - Select the target and go to the "Signing & Capabilities" tab
   - Select your team and configure the bundle identifier

4. **Build the app**:
   - Select a destination (device or simulator)
   - Click the build button (▶) or press Cmd+B

### Publishing to App Store

1. Create a new application in [App Store Connect](https://appstoreconnect.apple.com/)
2. Configure the app information, pricing, and availability
3. Upload screenshots and app metadata
4. Archive the app in Xcode and upload it using the Organizer
5. Complete the compliance information
6. Submit for review

## Expo Web Deployment

If you want to deploy as an Expo web application:

1. **Build the web bundle**:
   ```bash
   npx expo build:web
   ```

2. **Deploy the web build**:
   The built files will be in the `web-build` directory, which can be deployed to any static hosting service.

## Troubleshooting Common Issues

### Android Build Issues

1. **Gradle Build Failures**:
   - Check that your Android SDK is properly installed
   - Verify the paths in `android/local.properties`
   - Update Gradle if needed: `cd android && ./gradlew wrapper --gradle-version=7.5.1`

2. **Missing Android SDK Components**:
   ```bash
   sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
   ```

3. **JDK Version Issues**:
   - Ensure you're using JDK 11 or newer
   - Set JAVA_HOME environment variable correctly

### iOS Build Issues

1. **Code Signing Errors**:
   - Verify your Apple Developer account has a valid membership
   - Check that your provisioning profiles are valid
   - Try using automatic signing in Xcode

2. **Missing Pods**:
   ```bash
   cd ios && pod install
   ```

3. **Minimum iOS Version**:
   - Check that the deployment target in Xcode is set to iOS 13 or higher

## Deployment Checklist

Before releasing to app stores:

1. **Testing**:
   - Test the app on multiple device types and OS versions
   - Test critical flows: job creation, application, payment, etc.
   - Verify push notifications work correctly

2. **App Store Requirements**:
   - Privacy policy URL is provided
   - All required permissions are justified
   - Support URL and contact information are valid
   - Screenshots match the current version

3. **Technical Requirements**:
   - App icon is provided in all required sizes
   - Splash screen is properly configured
   - Deep linking works correctly
   - Proper handling of offline states

4. **Performance**:
   - App loads within acceptable time
   - UI is responsive on low-end devices
   - Memory usage is optimized
   - Battery consumption is reasonable

## Updating the Mobile App

For future updates:

1. Increment the version number in:
   - `app.json`
   - `android/app/build.gradle` (for Android)
   - Xcode project settings (for iOS)

2. Follow the same build process as above

3. For Google Play:
   - Upload the new APK to a new release
   - Submit for review

4. For App Store:
   - Archive and upload the new build
   - Submit for review

---

Note: Remember to keep your signing keys and certificates in a secure location. Losing them can prevent you from updating your app in the future.