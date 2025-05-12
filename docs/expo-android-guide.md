# Connecting the Fixer App to Your Android Phone

This guide will help you connect the Fixer app to your Android phone using Expo Go.

## Prerequisites

1. **Android Phone** with Android 5.0 (Lollipop) or newer
2. **Expo Go** app installed on your phone
   - [Download from Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
3. Your computer and phone on the **same WiFi network**

## Steps to Connect

### 1. Run the Connect Script

In your Replit terminal, run:

```bash
./connect-to-phone.sh
```

This script will:
- Set up the Fixer app icon
- Start the Expo development server
- Provide you with connection options

### 2. Choose a Connection Method

You'll be prompted to choose between:
- **Local** - Fastest, but requires same WiFi network
- **Tunnel** - Most reliable, works across networks (recommended)
- **LAN** - Local network only

For most users, the **Tunnel** option (default) works best.

### 3. Scan the QR Code

Once the Expo server is running, it will display a QR code in the terminal:

1. Open the **Expo Go** app on your Android phone
2. Tap the **Scan QR Code** button in Expo Go
3. Scan the QR code displayed in your Replit terminal

The Fixer app will now load on your phone.

## Troubleshooting

### Connection Issues

If you can't connect:

1. **Make sure** your phone and computer are on the same WiFi network
2. **Try the tunnel option** if local connection fails
3. **Check your firewall** settings (they might block the connection)
4. **Try entering the URL manually** in Expo Go
5. **Restart** the Expo Go app

### Slow Performance

If the app loads slowly:

1. **Close other apps** on your phone
2. **Use the local connection** option if you're on the same network
3. **Restart** the Expo Go app

## Features Available in the App

When using the app on your phone:

- **Full geolocation** functionality
- **Maps and heat maps** with your actual location
- **Push notifications** for new jobs near you
- **Camera access** for profile photos
- **Offline** functionality
- **Native UI** components

## Building a Native Android APK

For a more permanent installation or distribution, you can build a native Android APK:

### Using the Build Script

1. **Make the build script executable:**
   ```bash
   chmod +x build-android.sh
   ```

2. **Run the build script:**
   ```bash
   ./build-android.sh
   ```

3. **Install the APK:**
   - Transfer the generated `fixer-app.apk` to your Android device
   - Open the APK file on your device to install
   - You may need to enable "Install from Unknown Sources" in your device settings

### What the Build Script Does

The script automates the following:
1. Builds the React web application
2. Sets up a Capacitor Android project
3. Syncs the web build to the Android project
4. Compiles a native Android APK
5. Makes the APK available for installation

### System Requirements for Building

- Android SDK installed (set in `ANDROID_SDK_ROOT` environment variable)
- Java Development Kit (JDK) installed
- Gradle build system

## Notes

- Changes you make to the code will automatically update on your phone when using Expo Go
- The app may disconnect if your computer goes to sleep or the network changes
- The native APK build provides a standalone installation that doesn't require Expo Go