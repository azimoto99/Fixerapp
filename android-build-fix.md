# Android Build Fix Guide

This guide solves the common build issues for the Fixer Android app.

## Issue 1: Missing Dependencies

The build fails due to missing dependencies like `@emotion/is-prop-valid` which is required by framer-motion.

**Solution:**
```bash
# Run these commands to install the missing dependencies
yarn add @emotion/is-prop-valid @babel/core @babel/plugin-transform-export-namespace-from
```

## Issue 2: Babel Configuration

The Android build requires specific Babel plugins to handle modern JavaScript features.

**Solution:**
Ensure your `babel.config.js` has the following:

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

## Issue 3: Platform-Specific Code

Create separate implementations for components that use web-specific libraries like Leaflet.

The pattern `ComponentName.native.tsx` for mobile and `ComponentName.tsx` for web works well.

## Issue 4: Handling Build Export

When exporting to Git:

1. Make sure all platform-specific code is properly separated
2. Ensure all needed dependencies are installed
3. Verify the app.json configuration is correct:
   - Check the name, slug, and bundle ID
   - Verify the Android configuration section
   - Make sure all permissions are properly declared

## Testing Android Builds

```bash
# Build Android app bundle
eas build --platform android --profile production

# Build Android apk for direct distribution
eas build --platform android --profile androidApk

# For a simple build without credentials
eas build --platform android --profile simpleBuild
```