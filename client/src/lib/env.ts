import { Platform } from 'react-native';

// This module provides a cross-platform way to access environment variables
// that works in both Vite (web) and React Native environments

// Define interface for our environment variables
interface EnvVars {
  STRIPE_PUBLIC_KEY: string;
  // Add other environment variables as needed
}

let env: EnvVars;

// Different approach based on platform
if (Platform.OS === 'web') {
  // Web environment - use Vite's import.meta.env
  env = {
    STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY || '',
    // Add other environment variables as needed
  };
} else {
  // React Native environment - use @env
  try {
    const reactNativeEnv = require('@env');
    env = {
      STRIPE_PUBLIC_KEY: reactNativeEnv.STRIPE_PUBLIC_KEY || '',
      // Add other environment variables as needed
    };
  } catch (error) {
    console.warn('Failed to load React Native environment variables:', error);
    // Fallback to empty values
    env = {
      STRIPE_PUBLIC_KEY: '',
      // Add other environment variables as needed
    };
  }
}

export default env;