#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Clear terminal
clear

echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}   🌐 Starting Expo Web Server 🌐   ${NC}"
echo -e "${GREEN}=================================${NC}\n"

echo -e "${BLUE}Setting up Metro environment...${NC}\n"

# Create symbolic link to our fixed config if it doesn't exist
if [ -f fixed-metro.config.cjs ] && [ ! -L metro.config.cjs ]; then
  echo -e "Using fixed Metro configuration..."
  cp fixed-metro.config.cjs metro.config.cjs
fi

# Update metro.config.js to CommonJS format
if [ -f metro.config.js ]; then
  cat > metro.config.js << EOF
// This is a compatibility file for metro.config.js
// Using CommonJS syntax since it's being loaded with require()

// Simply load and re-export the actual config from metro.config.cjs
const metroConfig = require('./metro.config.cjs');
module.exports = metroConfig;
EOF
  echo -e "Updated metro.config.js to CommonJS format"
fi

echo -e "${YELLOW}Starting Expo in web-only mode...${NC}\n"

# Create a minimal App.js file if it doesn't exist
if [ ! -f App.js ] || [ $(cat App.js | wc -l) -lt 10 ]; then
  echo -e "Creating a simple App.js for testing..."
  cat > App.js << EOF
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fixer App</Text>
      <Text style={styles.subtitle}>Successfully connected with Expo!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
  },
});
EOF
fi

# Start Expo with web only
export EXPO_FORCE_WEB_ONLY=1
npx expo start --web --no-dev

echo -e "\n${GREEN}Expo web server started!${NC}\n"
echo -e "You can connect to Expo Go using the QR code or URL above.\n"