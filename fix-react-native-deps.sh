#!/bin/bash

echo "===== Installing missing React Native dependencies ====="

# Install key dependencies needed for Android builds
yarn add @emotion/is-prop-valid

# Add babel plugins needed for React Native
yarn add @babel/core @babel/plugin-transform-export-namespace-from

# Make the file executable
chmod +x ./fix-react-native-deps.sh

echo "===== Dependencies installed successfully ====="