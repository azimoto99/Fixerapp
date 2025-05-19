// expo-env.js
// This file helps load environment variables in the Expo/React Native environment
const fs = require('fs');
const dotenv = require('react-native-dotenv');
const path = require('path');

// Read the .env file
try {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    console.log('Loading environment variables for Expo from .env');
    require('dotenv').config({ path: envPath });
  } else {
    console.log('No .env file found for Expo environment');
  }
} catch (error) {
  console.error('Error loading environment variables for Expo:', error);
}

// Make sure Stripe key is available in the global scope for mobile
if (process.env.VITE_STRIPE_PUBLIC_KEY) {
  console.log('Stripe public key loaded for Expo');
  global.__STRIPE_PK = process.env.VITE_STRIPE_PUBLIC_KEY;
}

module.exports = {
  // Any additional exports for Expo environment
};