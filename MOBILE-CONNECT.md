# Connecting Fixer App to Your Mobile Device

Fixer is designed to work seamlessly on mobile devices. This guide provides multiple ways to connect your app to a phone.

## Quick Start (Recommended)

Run the following command in your Replit Shell:

```bash
./expo-connect.sh
```

This will generate a QR code in the console that you can scan with the Expo Go app on your phone.

## Connect Options

Fixer provides several connection options:

### 1. Console QR Code Generator

```bash
# Quick connect with auto-detected URL
./expo-connect.sh

# Generate a QR code for a specific URL
node url-qr.js YOUR_URL
```

### 2. Manual Connection

1. Open the Expo Go app on your phone
2. Choose "Enter URL manually" 
3. Enter your Replit URL with the format: `exp://YOUR-REPLIT-URL`
   - For example: `exp://workspace.yourusername.repl.co`

### 3. Detailed Setup

For more comprehensive setup instructions:

```bash
# Detailed connection script with multiple options
./connect-to-phone.sh
```

## Troubleshooting

If you're having trouble connecting:

1. **URL Issues**: Make sure you're using the `exp://` protocol, not `https://`
2. **Network Problems**: Ensure phone and computer are on the same network, or try mobile data
3. **QR Code Not Working**: Try entering the URL manually
4. **Expo App Issues**: Restart the Expo Go app or update to the latest version

## Documentation

Detailed guides are available in:

- `docs/connecting-to-your-phone.md` - General connection guide
- `docs/expo-android-guide.md` - Android-specific instructions

## Common Commands

| Command | Description |
|---------|-------------|
| `./expo-connect.sh` | Generate a QR code for quick connection |
| `./connect-to-phone.sh` | Detailed connection script with options |
| `node url-qr.js` | Direct QR code generator |

## Notes

- The app icon and branding will be visible on your phone when connected
- Changes to the code will update in real-time on your phone
- For a production app, you would build a proper APK/AAB file