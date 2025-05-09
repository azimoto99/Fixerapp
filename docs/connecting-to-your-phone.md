# Connecting Fixer App to Your Phone

This guide will help you connect the Fixer app directly to your phone using Expo Go.

## Prerequisites

1. **Your phone and computer on the same WiFi network**
   - This is essential for local development
   - If you're having issues, you can also use Expo's tunnel feature

2. **Expo Go app installed on your phone**
   - [Download for Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [Download for iOS](https://apps.apple.com/app/expo-go/id982107779)

## Step 1: Install Required Dependencies

First, let's make sure all required dependencies are installed:

```bash
./setup-expo.sh
```

Or run manually:

```bash
npm install --legacy-peer-deps expo expo-cli @expo/webpack-config expo-dev-client expo-updates
```

## Step 2: Start Expo Development Server

Run the following command to start the Expo development server:

```bash
npx expo start
```

This will:
- Start a development server
- Display a QR code in the terminal
- Open Expo Developer Tools in your browser

## Step 3: Connect Your Phone

### For Android:

1. Open the Expo Go app on your Android device
2. Tap "Scan QR Code" 
3. Scan the QR code displayed in your terminal or browser
4. The app should load on your device

### For iOS:

1. Open the Camera app on your iOS device
2. Scan the QR code displayed in your terminal or browser
3. Tap the banner that appears at the top of your screen
4. The Expo Go app will open and load your project

## Step 4: Development Options

While connected, you'll have access to several development features:

- **Live Reloading**: Changes will automatically refresh
- **Hot Reloading**: Most changes will update without a full refresh
- **Developer Menu**: Shake your device to access developer options

## Troubleshooting

### Connection Issues

If you can't connect via the default connection method:

1. In the terminal where Expo is running, press `d` to open the developer tools
2. Select "Connection" and choose "Tunnel" instead of "LAN"
3. A new QR code will be generated - scan this one instead

### Expo Client Out of Date

If you see a message that Expo Client is out of date:

1. Update the Expo Go app on your phone
2. Make sure your project's dependencies are up to date

### Unable to Scan QR Code

If scanning the QR code doesn't work:

1. In the Expo Go app, tap "Enter URL manually"
2. Enter the URL displayed near the QR code (e.g., exp://192.168.1.5:19000)

## Advanced: Setting Up for Production

When you're ready to create a standalone app for distribution:

1. Update your app.json with appropriate metadata
2. Create a build using EAS:

```bash
npx eas build --platform android
# or
npx eas build --platform ios
```

## Using Expo Go's Development Client

For projects with custom native code:

1. Build a development client:

```bash
npx eas build --profile development
```

2. Install the resulting app on your device
3. This custom development client can work with native modules

## Need More Help?

Refer to the [Expo documentation](https://docs.expo.dev/get-started/installation/) for more detailed information.