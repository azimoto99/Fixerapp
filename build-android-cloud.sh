#!/bin/bash

# Fixer App - Cloud Build Script (EAS Build)
# This script builds the Android APK using Expo's cloud build service

set -e

echo "☁️ Fixer App - Cloud Build Script (EAS)"
echo "======================================="
echo

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    print_status "Installing EAS CLI..."
    npm install -g @expo/eas-cli
    print_success "EAS CLI installed"
else
    print_success "EAS CLI already installed"
fi

# Check if user is logged in
print_status "Checking EAS authentication..."
if ! eas whoami &> /dev/null; then
    print_warning "You need to log in to EAS"
    print_status "Please log in with your Expo account:"
    eas login
else
    print_success "Already logged in to EAS"
fi

# Build web app first
print_status "Building web application..."
npm run build
npx cap sync android
print_success "Web app built and synced"

# Configure EAS build if not already done
if [ ! -f "eas.json" ]; then
    print_status "Configuring EAS build..."
    eas build:configure
else
    print_success "EAS already configured"
fi

echo
print_status "Starting cloud build..."
print_warning "This will build your app in the cloud and may take 5-15 minutes"
echo

# Start the build
print_status "Building Android APK with EAS..."
eas build --platform android --profile preview

print_success "Cloud build completed!"
echo
echo "🎉 Your APK has been built in the cloud!"
echo "📱 Download it from the EAS dashboard or the link provided above"
echo "🔗 Visit: https://expo.dev/accounts/[your-account]/projects/fixer/builds"
echo
echo "Next steps:"
echo "1. Download the APK from EAS dashboard"
echo "2. Install it on your Android device"
echo "3. Test the app functionality"
