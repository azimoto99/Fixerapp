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
echo -e "${GREEN}   🔧 Launching Expo with Fixed Config 🔧   ${NC}"
echo -e "${GREEN}=================================${NC}\n"

echo -e "${BLUE}Setting up Expo with custom Metro config...${NC}\n"

# Use the fix-metro.cjs as the Metro configuration
export METRO_CONFIG=./fix-metro.cjs

# Launch Expo with the fixed configuration
echo -e "${YELLOW}Starting Expo using custom CommonJS Metro config...${NC}\n"
npx expo start --web --no-dev --tunnel --metro-config=./fix-metro.cjs || {
  echo -e "${RED}Failed to start Expo with primary method.${NC}"
  echo -e "${YELLOW}Trying alternative approach...${NC}\n"
  EXPO_USE_METRO_LEGACY_DEFAULTS=1 npx expo start --web --no-dev --tunnel
}

echo -e "\n${GREEN}Expo started!${NC}"
echo -e "Connect with Expo Go using the URL or QR code above.\n"