#!/bin/bash

# Fixer App - Local Android Build Script
# This script builds the Android APK locally using Android SDK

set -e  # Exit on any error

echo "🚀 Fixer App - Android Build Script"
echo "===================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Java
if ! command -v java &> /dev/null; then
    print_error "Java is not installed or not in PATH"
    print_error "Please install Java JDK 17+ and try again"
    print_error "Download from: https://adoptium.net/"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    print_error "Java version $JAVA_VERSION is too old. Please install Java 17 or newer."
    exit 1
fi
print_success "Java $JAVA_VERSION detected"

# Check Android SDK
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    print_error "ANDROID_HOME or ANDROID_SDK_ROOT environment variable is not set"
    print_error "Please install Android SDK and set the environment variable"
    print_error "Example: export ANDROID_HOME=/path/to/android-sdk"
    exit 1
fi

ANDROID_SDK=${ANDROID_HOME:-$ANDROID_SDK_ROOT}
if [ ! -d "$ANDROID_SDK" ]; then
    print_error "Android SDK directory not found: $ANDROID_SDK"
    exit 1
fi
print_success "Android SDK found at: $ANDROID_SDK"

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "Node.js and npm detected"

print_status "All prerequisites satisfied!"
echo

# Step 1: Install dependencies
print_status "Step 1: Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi
echo

# Step 2: Build web application
print_status "Step 2: Building web application..."
npm run build
if [ $? -eq 0 ]; then
    print_success "Web application built successfully"
else
    print_error "Web build failed"
    exit 1
fi
echo

# Step 3: Sync with Capacitor
print_status "Step 3: Syncing with Capacitor..."
npx cap sync android
if [ $? -eq 0 ]; then
    print_success "Capacitor sync completed"
else
    print_error "Capacitor sync failed"
    exit 1
fi
echo

# Step 4: Build Android APK
print_status "Step 4: Building Android APK..."
cd android

# Clean previous builds
print_status "Cleaning previous builds..."
./gradlew clean

# Build debug APK
print_status "Building debug APK..."
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    print_success "Android APK built successfully!"
    
    # Check if APK exists
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        print_success "APK created: $APK_PATH (Size: $APK_SIZE)"
        
        # Copy APK to project root for easy access
        cd ..
        cp "android/$APK_PATH" "fixer-app-debug.apk"
        print_success "APK copied to project root: fixer-app-debug.apk"
        
        echo
        echo "🎉 BUILD COMPLETE!"
        echo "=================="
        echo "Your Fixer app APK is ready:"
        echo "📱 File: fixer-app-debug.apk"
        echo "📏 Size: $APK_SIZE"
        echo
        echo "Next steps:"
        echo "1. Transfer the APK to your Android device"
        echo "2. Enable 'Install unknown apps' in device settings"
        echo "3. Install the APK"
        echo "4. Test the app functionality"
        echo
        echo "For production builds, use:"
        echo "./gradlew assembleRelease"
        echo
    else
        print_error "APK file not found at expected location"
        exit 1
    fi
else
    print_error "Android build failed"
    exit 1
fi

# Optional: Open Android Studio
echo "Would you like to open the project in Android Studio? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    print_status "Opening Android Studio..."
    cd ..
    npx cap open android
fi

print_success "Build script completed successfully!"
