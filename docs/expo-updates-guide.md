# Expo Updates Guide for Fixer App

This document explains how to use Expo Updates for over-the-air (OTA) updates to the mobile app without requiring users to download a new version from the app store.

## Overview

Expo Updates allows you to push updates to your app without going through the app store review process. This is useful for:

- Fixing bugs quickly
- Updating content
- Adding minor features
- A/B testing
- Staged rollouts

## GitHub Integration (Current Setup)

The project is currently integrated with GitHub and Expo's build system:

1. Every commit to the GitHub repository automatically triggers a new build in Expo
2. The build includes the OTA update configuration
3. When users open the app, they will automatically check for and receive the latest updates

This means you don't need to manually publish updates - simply commit your changes to GitHub and they will be available to users automatically.

## How Updates Work

When a user opens the app:
1. The app checks for updates from Expo's servers
2. If an update is available, it downloads it in the background
3. The user is prompted to apply the update
4. When the user agrees, the app reloads with the new version

All of this happens without going through the app store review process or requiring a new app download.

## Update Channels

Updates are published to specific channels, which are defined in eas.json:

- **production**: Used for production builds
- **preview**: Used for testing updates before pushing to production
- **development**: Used for development and testing

In our GitHub integration:
- The main branch builds to the production channel
- Feature branches (if configured) build to the preview channel
- This ensures that production users only receive well-tested updates

## Testing Your Updates

To test if your updates are working:

1. Make changes to your code
2. Commit and push to GitHub (this triggers an automatic build)
3. Wait for the build to complete (check Expo dashboard)
4. Open the app on your test device and it should receive the update

## Managing Updates in Expo Dashboard

You can monitor and manage your updates through the Expo dashboard:

1. Go to [expo.dev](https://expo.dev)
2. Navigate to your project
3. Click on "Updates" in the sidebar
4. Here you can see all published updates, their channels, and rollback if needed

## Rollbacks

If an update causes issues, you can roll back to a previous version:

1. Go to the Expo dashboard for your project
2. Navigate to the Updates tab
3. Find the previous working update
4. Click "Rollback to this update"

## Version Tracking in the App

The app now displays the current version and update ID at the bottom of the screen:
- In development mode: "Version 1.0.0 (Dev Mode)"
- In production: "Version 1.0.0 (Update ID: abcd1234)"

This makes it easy to verify which update is currently installed.

## Troubleshooting

If updates aren't working:

1. Check the Expo dashboard to confirm the build completed successfully
2. Verify the GitHub action ran correctly (under Actions tab in GitHub)
3. Make sure your app has internet connectivity to fetch updates
4. Check the device logs for any errors related to updates

## References

- [Expo Updates Documentation](https://docs.expo.dev/versions/latest/sdk/updates/)
- [EAS Update Guide](https://docs.expo.dev/eas-update/introduction/)
- [GitHub Integration Guide](https://docs.expo.dev/guides/github-actions/)