# Expo Connection Fix

## The Problem

When trying to connect to Expo Go, you might encounter this error:

```
Error [ERR_REQUIRE_ESM]: require() of ES Module /home/runner/workspace/metro.config.js from /home/runner/workspace/Fixer/node_modules/cosmiconfig/node_modules/import-fresh/index.js not supported.
```

This happens because:
1. The project is configured with `"type": "module"` in package.json
2. This makes all .js files ES modules by default
3. But metro.config.js needs to be a CommonJS module

## Solution: Use Our Fixed Scripts

We've created alternative scripts that bypass this issue:

### Option 1: Direct Expo Go Connection

```bash
./expo-go-direct.sh
```

This script provides direct connection URLs for Expo Go without relying on metro.config.js at all. It uses:
- `exp://fixer.gg` - Simple direct connection
- `exp+fixer://expo-development-client/?url=https://fixer.gg` - Development client format

### Option 2: Launch Expo with Fixed Metro Config

```bash
./launch-expo.sh
```

This script:
1. Uses a CommonJS version of the metro config (fix-metro.cjs)
2. Sets the METRO_CONFIG environment variable
3. Launches Expo with the correct configuration
4. Falls back to legacy mode if needed

### Option 3: Access via Redirect Page

Visit `https://fixer.gg/expo-redirect.html` on your mobile device and tap the connection buttons.

## Alternative Solutions

If the scripts don't work, you can try:

1. Rename metro.config.js to metro.config.cjs (already done)
2. Create a package.json in the workspace root with `"type": "commonjs"`
3. Change package.json "type" to "commonjs" (more invasive)

## Remember

- Always deploy any changes to your production site before trying to connect with Expo Go
- Ensure the redirect page (expo-redirect.html) is accessible on your domain
- Test all connection URLs provided as device compatibility varies