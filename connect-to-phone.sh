#!/bin/bash

# Make this script executable with: chmod +x connect-to-phone.sh
# Run it with: ./connect-to-phone.sh

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Expo is installed
if ! command -v npx &> /dev/null; then
  echo -e "${YELLOW}NPX not found. Installing required dependencies...${NC}"
  npm install --global npx
fi

# Install Expo dependencies if needed
if ! npm list expo &> /dev/null; then
  echo -e "${YELLOW}Expo not found. Installing Expo dependencies...${NC}"
  npm install --legacy-peer-deps expo expo-cli @expo/webpack-config expo-dev-client expo-updates
fi

# Create necessary directories
mkdir -p assets

# Clear terminal
clear

# Display welcome message
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}   Fixer App - Connect to Phone${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${BLUE}This script will help you connect the Fixer app to your phone.${NC}"
echo ""
echo -e "1. Make sure your computer and phone are on the same WiFi network"
echo -e "2. Install the ${YELLOW}Expo Go${NC} app on your phone from the app store"
echo -e "3. When the QR code appears, scan it with your phone's camera"
echo ""
echo -e "${YELLOW}The app will start on your phone automatically after scanning.${NC}"
echo ""
echo -e "${GREEN}Starting Expo development server...${NC}"
echo ""

# Start Expo in tunnel mode for better connectivity
npx expo start --tunnel