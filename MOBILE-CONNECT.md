# Connecting Fixer App to Your Mobile Device

Fixer is designed to work seamlessly on mobile devices. This guide provides multiple ways to connect your app to a phone using Expo Go.

## Quick Start Connection (Recommended)

Run the following command in your Replit Shell:

```bash
./expo-connect.sh
```

This will generate QR codes in the console that you can scan with the Expo Go app on your phone.

## Advanced Connection Options

If the quick start method doesn't work, try the advanced connection options:

```bash
./expo-connect-advanced.sh
```

This provides multiple URL formats and QR codes that are compatible with different versions of Expo Go and different network environments.

## Connection Methods

Fixer provides several ways to connect your device:

### 1. Scan QR Code (Easiest)

1. Install Expo Go on your phone
2. Run `./expo-connect.sh` or `./expo-connect-advanced.sh` 
3. Scan the QR code with the Expo Go app

### 2. Manual URL Entry

1. Open the Expo Go app on your phone
2. Choose "Enter URL manually" 
3. Enter one of these URL formats:
   - Standard: `exp://workspace.yourusername.repl.co`
   - With port: `exp://workspace.yourusername.repl.co:80`
   - Dev client: `exp+fixer://workspace.yourusername.repl.co`
   - Alternative: `https://workspace.yourusername.repl.co/--/`

### 3. Direct Script Options

For advanced or custom connections:

```bash
# Quick connect with standard format
./expo-connect.sh

# Advanced connect with multiple URL options
./expo-connect-advanced.sh

# Custom QR generation
node url-qr.js

# Multiple URL formats and troubleshooting
node expo-connect-direct.js
```

## Troubleshooting Connection Issues

If you're having trouble connecting:

1. **Try Multiple Formats**: Use `./expo-connect-advanced.sh` to try different URL formats
2. **Network Settings**: 
   - Ensure phone and Replit are on the same network
   - For Android: Toggle between "LAN" and "Tunnel" in Expo settings
3. **App Restart**: Close and reopen the Expo Go app between attempts
4. **Manual Entry**: If QR codes don't work, manually type the URL
5. **Expo Version**: Make sure you have the latest version of Expo Go

## Available Scripts

| Command | Description |
|---------|-------------|
| `./expo-connect.sh` | Standard connection with basic QR code |
| `./expo-connect-advanced.sh` | Advanced connection with multiple formats |
| `node expo-connect-direct.js` | Generate all possible connection formats |
| `node url-qr.js` | Direct QR code generator for standard format |

## Notes

- The Fixer app icon will be visible on your phone when connected
- Changes to the code will update in real-time on your connected device
- Ensure your Replit workspace is running before attempting to connect