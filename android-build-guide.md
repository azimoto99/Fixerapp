# Fixer App - Android Build Guide

This guide walks you through building the Fixer app for Android using Git export.

## Prerequisites

1. Make sure your app has the following dependencies installed:
   - @emotion/is-prop-valid
   - @babel/core
   - @babel/plugin-transform-export-namespace-from
   - @expo/metro-config

2. Ensure your babel.config.js includes:
   ```js
   module.exports = function (api) {
     api.cache(true);
     return {
       presets: [
         ["babel-preset-expo", {
           "unstable_transformImportMeta": true
         }]
       ],
       plugins: [
         "transform-inline-environment-variables",
         "@babel/plugin-transform-export-namespace-from",
         ["module:react-native-dotenv", {
           "moduleName": "@env",
           "path": ".env",
           "blacklist": null,
           "whitelist": null,
           "safe": false,
           "allowUndefined": true
         }],
         ["babel-plugin-transform-import-meta", {
           "module": "ES6"
         }]
       ],
       env: {
         production: {
           plugins: ["transform-remove-console"]
         }
       }
     };
   };
   ```

3. Proper metro.config.js extending Expo's configuration:
   ```js
   const { getDefaultConfig } = require('@expo/metro-config');
   const defaultConfig = getDefaultConfig(__dirname);
   
   module.exports = {
     ...defaultConfig,
     resolver: {
       ...defaultConfig.resolver,
       assetExts: [
         ...defaultConfig.resolver.assetExts,
         'mp3', 'wav', 'ogg', 'mp4', 'avi', 'mov', 'wmv', 'xml', 'pdf'
       ],
       sourceExts: [
         ...defaultConfig.resolver.sourceExts,
         'md', 'mdx'
       ],
     },
     watchFolders: [
       ...defaultConfig.watchFolders,
       __dirname + '/client/src',
       __dirname + '/shared',
     ],
   };
   ```

## Building with EAS

For the smoothest experience, use Expo Application Services (EAS) to build your app.

### Setup 

1. Make sure you're logged in:
   ```
   npx eas-cli login
   ```

2. Configure your build in eas.json (already done)

### Build Options

To build the app using EAS, select one of the following commands:

1. **For development testing:**
   ```
   npx eas build --platform android --profile development
   ```

2. **For internal distribution (APK):**
   ```
   npx eas build --platform android --profile preview
   ```

3. **For production Play Store release (AAB):**
   ```
   npx eas build --platform android --profile production
   ```

4. **For direct APK distribution:**
   ```
   npx eas build --platform android --profile androidApk
   ```

5. **Quick build without credentials:**
   ```
   npx eas build --platform android --profile simpleBuild
   ```

## Common Build Issues

If you encounter errors during the build process:

1. **Metro bundler errors:**
   - Ensure metro.config.js extends @expo/metro-config
   - Check for any React Native/web compatibility issues

2. **Missing dependencies:**
   - Make sure all required packages are installed
   - Check for peer dependency warnings

3. **Environment variables:**
   - Ensure Stripe public key is accessible in the Expo environment
   - Verify eas.json env configuration

4. **Platform-specific code:**
   - Ensure components use proper .native.tsx extensions where needed
   - Fix any direct React Native imports in web components

## Git Export

When exporting to Git for building:

1. Commit all necessary files
2. Exclude build artifacts and unnecessary files
3. Include all dependencies in package.json

EAS Build will clone your repository and build from your source code.