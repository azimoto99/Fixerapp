#!/bin/bash
# Script to fix Android build issues related to keystore generation

# Make sure the script is executable
chmod +x *.sh

# First backup the eas.json file
cp eas.json eas.json.bak

# Create a modified version of eas.json for non-interactive builds
cat > eas.json << 'EOF'
{
  "cli": {
    "version": ">= 3.15.1",
    "appVersionSource": "remote",
    "requireCommit": false
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      },
      "env": {
        "EXPO_PUBLIC_STRIPE_KEY": "${process.env.VITE_STRIPE_PUBLIC_KEY}"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      },
      "env": {
        "EXPO_PUBLIC_STRIPE_KEY": "${process.env.VITE_STRIPE_PUBLIC_KEY}"
      }
    },
    "production": {
      "autoIncrement": true,
      "distribution": "store",
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease",
        "withoutCredentials": true
      },
      "env": {
        "EXPO_PUBLIC_STRIPE_KEY": "${process.env.VITE_STRIPE_PUBLIC_KEY}"
      }
    },
    "androidApk": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease",
        "withoutCredentials": true
      },
      "env": {
        "EXPO_PUBLIC_STRIPE_KEY": "${process.env.VITE_STRIPE_PUBLIC_KEY}"
      }
    },
    "simpleBuild": {
      "android": {
        "buildType": "apk",
        "image": "latest",
        "withoutCredentials": true
      },
      "env": {
        "EXPO_PUBLIC_STRIPE_KEY": "${process.env.VITE_STRIPE_PUBLIC_KEY}"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
EOF

echo "Modified eas.json for non-interactive builds"
echo "Run your build command with the --non-interactive flag"
echo "For example: eas build --platform android --profile simpleBuild --non-interactive"
echo ""
echo "IMPORTANT: After building, restore the original eas.json with: mv eas.json.bak eas.json"