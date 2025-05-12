# Expo Updates Guide for Fixer App

This document explains how to use Expo Updates for over-the-air (OTA) updates to the mobile app without requiring users to download a new version from the app store.

## Overview

Expo Updates allows you to push updates to your app without going through the app store review process. This is useful for:

- Fixing bugs quickly
- Updating content
- Adding minor features
- A/B testing
- Staged rollouts

## Prerequisites

Before using Expo Updates, you need:

1. An Expo account (create one at [expo.dev](https://expo.dev))
2. The EAS CLI installed globally: `npm install -g eas-cli`
3. Proper configuration in app.json and eas.json (already set up in this project)

## Publishing Updates

The simplest way to publish an update is to use the provided script:

```
./publish-update.sh
```

This script will:
1. Check if EAS CLI is installed
2. Verify you're logged in to EAS
3. Build the web app
4. Publish the update to Expo

Alternatively, you can publish updates manually:

```bash
# Build the web app first
npm run build

# Publish the update
eas update --auto
```

## Update Channels

Updates are published to specific channels, which are defined in eas.json:

- **production**: Used for production builds
- **preview**: Used for testing updates before pushing to production
- **development**: Used for development and testing

When building the app, specify which channel to use:

```bash
# For production builds
eas build --profile production --platform android

# For testing builds
eas build --profile preview --platform android
```

## Testing Updates

To test if updates are working:

1. Install a build from a specific channel
2. Make changes to your app
3. Publish an update to that channel using `eas update --channel [channel-name]`
4. Open the app and verify it receives the update

## Rollbacks

If an update causes issues, you can roll back to a previous version:

1. Go to the Expo dashboard for your project
2. Navigate to the Updates tab
3. Find the previous working update
4. Click "Rollback to this update"

## Troubleshooting

If updates aren't working:

1. Verify the app is built with the correct channel
2. Check that app.json has the correct updates configuration
3. Make sure expo-updates is properly installed and configured
4. Look at the device logs for any errors related to updates

## References

- [Expo Updates Documentation](https://docs.expo.dev/versions/latest/sdk/updates/)
- [EAS Update Guide](https://docs.expo.dev/eas-update/introduction/)