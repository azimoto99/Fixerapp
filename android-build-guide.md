# Android Build Guide

This guide provides instructions for building the Fixer app for Android through GitHub.

## Common Build Errors

### Keystore Generation Error

If you encounter this error during an EAS build:
```
Generating a new Keystore is not supported in --non-interactive mode
Error: build:internal command failed.
```

This happens because EAS is trying to create a new signing keystore but can't do this in non-interactive mode.

## Solution Steps

1. Run the `build-android-fix.sh` script to modify the build configuration:
   ```bash
   ./build-android-fix.sh
   ```

2. Use one of these build commands:

   **For development testing:**
   ```bash
   eas build --platform android --profile development --non-interactive
   ```

   **For an APK file:**
   ```bash
   eas build --platform android --profile androidApk --non-interactive
   ```

   **For a production build:**
   ```bash
   eas build --platform android --profile simpleBuild --non-interactive
   ```

3. After building, restore your original EAS configuration:
   ```bash
   mv eas.json.bak eas.json
   ```

## GitHub Build Steps

If you're building through GitHub:

1. Push your changes to GitHub
2. In your GitHub workflow or Actions:
   - Add a step to run `./build-android-fix.sh`
   - Run the build command with the `--non-interactive` flag
   - Use the `androidApk` or `simpleBuild` profile

## Alternative: Use Pre-Generated Keystore

For a more permanent solution, you can:

1. Generate a keystore locally:
   ```bash
   keytool -genkeypair -v -keystore fixer.keystore -alias fixer -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Upload the keystore to EAS using:
   ```bash
   eas credentials --platform android
   ```

3. Then your builds will use the stored credentials instead of trying to generate them.

## Need Help?

If you continue to experience issues with the build process, you might need to adjust the build settings based on your specific GitHub workflow or consider using EAS's remote credentials system.