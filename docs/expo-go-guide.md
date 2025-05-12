# Using Fixer with Expo Go

This guide explains how to run and test the Fixer app on your mobile device using Expo Go.

## What is Expo Go?

Expo Go is a free, open-source client app that allows you to open up Expo projects on your phone while in development. It provides a quick way to test your app on real mobile devices without having to build and install a full APK file.

## Prerequisites

- A smartphone (Android or iOS) with the Expo Go app installed:
  - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
- Your Replit project running on a public URL

## Connection Methods

There are three convenient ways to connect your mobile device to the Fixer app running on Replit:

### Method 1: Using the QR Code (Recommended)

1. Make sure your Replit project is running
2. Run the connection script in your Replit terminal:
   ```
   ./expo-connect.sh
   ```
   or
   ```
   ./expo-go-connect.sh
   ```
3. Scan the QR code with your phone:
   - **Android**: Open Expo Go and use the "Scan QR Code" feature
   - **iOS**: Use the built-in Camera app to scan, then tap the notification

### Method 2: Manual URL Entry

1. Run the connection script to see the available URLs
2. Open Expo Go on your phone
3. Tap "Enter URL manually" 
4. Enter one of the provided URLs from the script output

### Method 3: Development Build (Advanced)

For more advanced features or if the above methods don't work, you can create a development build:

1. Set up an Expo account
2. Run `npx expo run:android` or `npx expo run:ios` (requires appropriate SDKs)
3. This will create a custom build with better performance and more capabilities

## Troubleshooting

- **Connection Failed**: Make sure your phone and computer are on the same network
- **QR Code Not Working**: Try the manual URL entry method
- **App Crashes**: Check the Expo Go logs for details
- **White Screen**: Your Replit server might not be running
- **iOS Connection Issues**: You may need to open the URL in Safari first, then "Open in Expo Go"

## Using the App Via Expo Go

Once connected, you'll be using the web version of Fixer wrapped in the Expo Go container. Most features will work as if you were using the web version in a mobile browser.

Some features that work particularly well in Expo Go:
- Push notifications
- Location services
- Camera access (if implemented)
- Touch gestures

## Development vs. Production

Keep in mind that Expo Go is primarily a development tool. For production use:
- Use the Android APK build process for a standalone app
- Or deploy the web version and use as a progressive web app (PWA)

## Getting Help

If you encounter issues with Expo Go:
- Check the [Expo Documentation](https://docs.expo.dev/)
- Look at the error messages in the Expo Go app
- Review the output in your Replit console