# Android Build Guide

The maintained Android path in this repo is:

1. build the web app
2. sync it into the Capacitor Android project
3. build or run the Android app from there

If you only need to test on a phone, use the responsive web app in a mobile browser first. The Android packaging flow is for installable builds.

## Prerequisites

- Node.js 18+
- npm
- Java 11+
- Android SDK / Android Studio

## Build the Web App

```bash
npm install
npm run build
```

The production web bundle is generated in `dist/public`.

## Capacitor Configuration

The Android project should point at the same output directory:

```ts
webDir: 'dist/public'
```

That value is defined in [capacitor.config.ts](/c:/Users/azimo/OneDrive/Documents/apps/fixerapp/capacitor.config.ts).

## Sync to Android

```bash
npx cap sync android
```

If the Android project does not exist yet:

```bash
npx cap add android
```

## Open in Android Studio

```bash
npx cap open android
```

From Android Studio you can run a debug build on a device/emulator or create a release build.

## Helper Script

The repo keeps one Android helper script:

- `build-android.sh`

It wraps the same `npm run build` and `npx cap sync android` workflow described above.

## Troubleshooting

### White screen after launch

- Rebuild the web app with `npm run build`
- Confirm `dist/public/index.html` exists
- Run `npx cap sync android` again
- Verify `webDir` is `dist/public`

### Android SDK errors

- Set `ANDROID_SDK_ROOT`
- Confirm Android Studio can see the SDK and build tools

### Build succeeds but content is stale

- Rebuild the web app
- Sync again
- Clean/reinstall the app on the device if the WebView cache is stale

## Expo Note

Expo-related docs remain in the repo for experimentation, but Capacitor is the maintained packaging path here.
