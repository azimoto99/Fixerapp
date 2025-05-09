# Building Fixer App for Android with Expo Go

This guide explains how to set up and build the Fixer app using Expo Go for Android development.

## Prerequisites

1. Node.js and npm installed
2. Android Studio installed (for running Android emulator)
3. Expo Go app installed on your Android device (for testing on a physical device)

## Setup Steps

1. **Install Expo CLI globally**

   ```bash
   npm install -g expo-cli
   ```

2. **Install project dependencies**

   ```bash
   # Run the setup script
   ./setup-expo.sh
   
   # Or install manually with:
   npm install --legacy-peer-deps expo expo-cli @expo/webpack-config expo-dev-client expo-updates
   ```

3. **Set up environment**

   Make sure your Android device is connected to the same WiFi network as your development machine.

## Development Workflow

### Starting the Development Server

1. Start the Expo development server:

   ```bash
   npx expo start
   ```

2. You'll see a QR code in the terminal and a development server running.

### Testing on a Physical Device

1. Install the "Expo Go" app from the Google Play Store on your Android device.

2. Open the Expo Go app and scan the QR code from the terminal.

3. The app will load and run on your device, with hot reloading enabled for development.

### Testing on an Android Emulator

1. Start an Android emulator from Android Studio.

2. In your terminal where Expo is running, press `a` to open the app in the Android emulator.

## Building for Production

### Creating a Standalone Android APK

1. **Install EAS CLI:**

   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**

   ```bash
   eas login
   ```

3. **Configure EAS build:**

   ```bash
   eas build:configure
   ```

4. **Create a build:**

   ```bash
   eas build --platform android
   ```

   This will build an Android APK file that can be installed on any Android device.

## App Configuration

The app configuration is defined in `app.json` and includes settings for:

- App name and bundle ID
- Icons and splash screens
- Android-specific settings

You can modify these settings to customize the build process.

## Using Capacitor (Alternative)

If you prefer to use Capacitor instead of Expo for building:

1. Build the web app:

   ```bash
   npm run build
   ```

2. Sync the web app with Capacitor:

   ```bash
   npx cap sync
   ```

3. Open the Android project in Android Studio:

   ```bash
   npx cap open android
   ```

4. Build from Android Studio

## Troubleshooting

- **Module Resolution Issues**: If you encounter module resolution errors, check the `metro.config.js` file to ensure proper path mapping.

- **Dependency Conflicts**: Use the `--legacy-peer-deps` flag when installing packages to bypass peer dependency issues.

- **Expo SDK Errors**: Make sure all packages that depend on Expo SDK are compatible with the version you're using.

For more detailed information, refer to the [Expo documentation](https://docs.expo.dev/).