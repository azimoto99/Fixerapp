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
echo -e "${GREEN}   🔧 Fixing Expo and Vite Issues 🔧   ${NC}"
echo -e "${GREEN}=================================${NC}\n"

echo -e "${BLUE}Step 1: Installing required Metro dependencies...${NC}\n"
yarn add metro metro-cache metro-config metro-core metro-resolver metro-runtime

echo -e "\n${GREEN}Metro dependencies installed!${NC}\n"

echo -e "${BLUE}Step 2: Updating metro.config.js to use CommonJS syntax...${NC}\n"
if [ -f metro.config.js ]; then
  # Backup the original file
  if [ ! -f metro.config.js.original ]; then
    cp metro.config.js metro.config.js.original
    echo -e "Original metro.config.js backed up to metro.config.js.original"
  fi
  
  # Replace with CommonJS version
  cat > metro.config.js << EOF
// This is a compatibility file for metro.config.js
// Using CommonJS syntax since it's being loaded with require()

// Simply load and re-export the actual config from metro.config.cjs
const metroConfig = require('./metro.config.cjs');
module.exports = metroConfig;
EOF
  echo -e "Updated metro.config.js to use CommonJS format"
fi

echo -e "${BLUE}Step 3: Setting up environment variables...${NC}\n"
# Create .env file to disable top-level await error
if [ ! -f .env ]; then
  echo -e "Creating .env file with required settings..."
  cat > .env << EOF
ESBUILD_BINARY_PATH=node_modules/esbuild/bin/esbuild
VITE_CJS_IGNORE_WARNING=true
EOF
fi

# Export environment variables for this session
export ESBUILD_BINARY_PATH=node_modules/esbuild/bin/esbuild
export NODE_OPTIONS="--experimental-vm-modules"
export VITE_CJS_IGNORE_WARNING=true

echo -e "${YELLOW}All fixes have been applied!${NC}\n"
echo -e "${GREEN}Next steps:${NC}\n"
echo -e "1. To start the app: ${BLUE}npm run dev${NC}"
echo -e "2. To use Expo Go: ${BLUE}./expo-go-direct.sh${NC}"
echo -e "3. To start Expo: ${BLUE}./launch-expo.sh${NC}\n"
echo -e "If you still encounter issues, please run: ${RED}./fix-metro-deps.sh${NC}\n"