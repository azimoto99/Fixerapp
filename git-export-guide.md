# Git Export Build Guide for Fixer App

This guide will help you build the Fixer app by exporting to Git and using EAS Build.

## Prerequisites

1. Make sure you have:
   - An Expo account
   - EAS CLI installed (`npm install -g eas-cli`)
   - Git repository setup

## Step 1: Push your code to Git

```bash
# Initialize Git if not already done
git init

# Add all files
git add .

# Commit changes
git commit -m "Ready for Android build"

# Add your remote repository
git remote add origin <your-repository-url>

# Push to your repository
git push -u origin main
```

## Step 2: Build with EAS

Once your code is in a Git repository, you can build using EAS:

```bash
# Login to your Expo account if needed
eas login

# Build for Android (simpleBuild profile works without credentials)
eas build --platform android --profile simpleBuild --git-remote=<your-git-remote> --git-branch=main
```

EAS will:
1. Clone your repository
2. Install dependencies
3. Build your APK
4. Provide a download link

## Step 3: Install on Device

After the build completes:
1. Download the APK from the link provided by EAS
2. Install on your Android device

## Troubleshooting

If you encounter build errors:

1. **Metro bundler issues**:
   - Check the logs for bundler errors
   - Verify metro.config.js is properly configured

2. **Native code issues**:
   - Make sure the capacitor.settings.gradle file exists
   - Check that app.config.js is handling the dual configuration

3. **Environment variables**:
   - Verify Stripe public key is available in build environment
   - Check eas.json configuration is correct

4. **Dependency issues**:
   - Run `yarn install` to ensure all dependencies are properly installed
   - Verify @emotion/is-prop-valid and other required packages are installed