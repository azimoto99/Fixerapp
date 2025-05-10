# Fixer App with Expo Android Integration

This README provides instructions for building the Fixer app using Expo Go for Android development.

## What's Been Set Up

The following Expo configuration files have been added to the project:

1. `app.json` - Main Expo configuration file
2. `metro.config.js` - Metro bundler configuration
3. `babel.config.js` - Babel configuration for Expo
4. `App.js` - Entry point for Expo
5. `setup-expo.sh` - Helper script for Expo setup
6. `docs/expo-android-guide.md` - Detailed guide for Android development

## Quick Start

### 1. Install Expo dependencies

Run the setup script:

```bash
./setup-expo.sh
```

Or manually install the dependencies:

```bash
npm install --legacy-peer-deps expo expo-cli @expo/webpack-config expo-dev-client expo-updates
```

### 2. Start the Expo development server

```bash
npx expo start
```

### 3. Launch on Android

- **On emulator**: Press `a` in the terminal where Expo is running
- **On physical device**: Scan the QR code with the Expo Go app

## Project Structure

The project combines a traditional web application with Expo capability:

- `client/` - Web application code
- `server/` - Backend API code
- `assets/` - Assets for Expo (icons, splash screens)
- `App.js` - Entry point for Expo
- `app.json` - Expo configuration
- `capacitor.config.ts` - Capacitor configuration (alternative to Expo)

## Using Both Capacitor and Expo

This project supports both:

- **Capacitor**: For more native integration and direct access to native code
- **Expo**: For easier development workflow and quick iteration

## Known Limitations

- Some web-specific features might not work in the Expo environment
- CSS/Tailwind might render differently on native platforms
- Live API connection requires proper network configuration

## For More Information

See the detailed guide at `docs/expo-android-guide.md` for complete instructions on:

- Setting up your development environment
- Testing on physical devices
- Building a standalone APK
- Troubleshooting common issues

---

For questions or issues, please file an issue in the project repository.