#!/bin/bash

# Pre-Android Build Script for Fixer App
# This script prepares the environment for Android builds

echo "===== Fixer App - Pre-Android Build Setup ====="

# Create android directory if it doesn't exist
if [ ! -d "android" ]; then
  echo "Creating android directory..."
  mkdir -p android
fi

# Create capacitor.settings.gradle in project root
echo "Creating capacitor.settings.gradle in project root..."
cat > capacitor.settings.gradle << EOL
// Capacitor settings for Gradle
// This fallback file prevents build errors

// Safe method to include files only if they exist
def includeIfExists = { dir, name ->
    def path = "\${dir}/\${name}"
    if (new File(path).exists()) {
        include(name)
        project(":\${name}").projectDir = new File(path)
    }
}

// Try to include Capacitor Android if available
includeIfExists("../node_modules/@capacitor/android", "capacitor-android")
EOL

# Copy capacitor.settings.gradle to android directory if it exists
if [ -d "android" ]; then
  echo "Copying capacitor.settings.gradle to android directory..."
  cp capacitor.settings.gradle android/
fi

# Create a minimal settings.gradle in android directory if it doesn't exist
if [ ! -f "android/settings.gradle" ]; then
  echo "Creating minimal settings.gradle in android directory..."
  cat > android/settings.gradle << EOL
// Android project settings
rootProject.name = 'fixer'

// Apply Capacitor settings if available
def capacitorSettingsFile = new File(rootProject.projectDir, 'capacitor.settings.gradle')
if (capacitorSettingsFile.exists()) {
    apply from: capacitorSettingsFile.getAbsolutePath()
}

// Include app project if it exists
include ':app'
EOL
fi

# Create a minimal build.gradle in android directory if it doesn't exist
if [ ! -f "android/build.gradle" ]; then
  echo "Creating minimal build.gradle in android directory..."
  cat > android/build.gradle << EOL
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
    ext {
        buildToolsVersion = "33.0.0"
        minSdkVersion = 21
        compileSdkVersion = 33
        targetSdkVersion = 33
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:7.3.1'
    }
}

allprojects {
    repositories {
        mavenCentral()
        google()
        maven {
            url "\${project.rootDir}/../node_modules/jsc-android/dist"
        }
        maven {
            url "\${project.rootDir}/../node_modules/react-native/android"
        }
    }
}
EOL
fi

# Create app directory in Android folder if it doesn't exist
if [ ! -d "android/app" ]; then
  echo "Creating app directory in android folder..."
  mkdir -p android/app
fi

# Create minimal build.gradle in app directory if it doesn't exist  
if [ ! -f "android/app/build.gradle" ]; then
  echo "Creating minimal build.gradle in app directory..."
  cat > android/app/build.gradle << EOL
apply plugin: "com.android.application"

android {
    compileSdkVersion rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "com.fixer"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    // Empty for now, will be filled during the build process
}
EOL
fi

# Create .gitkeep files in empty directories to ensure they're committed in git
touch android/.gitkeep
touch android/app/.gitkeep

echo "===== Pre-Android Build Setup Complete ====="
echo "The project is now prepared for Android builds through GitHub integration"