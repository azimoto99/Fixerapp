#!/bin/bash

# Make this script executable with: chmod +x connect-to-phone.sh
# Run it with: ./connect-to-phone.sh

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if the app icon exists
if [ ! -f "assets/icon.png" ]; then
  echo -e "${RED}App icon not found. Copying from attached_assets...${NC}"
  cp "attached_assets/ChatGPT Image May 7, 2025, 01_31_24 AM.png" assets/icon.png
  cp assets/icon.png assets/adaptive-icon.png
  cp assets/icon.png assets/splash.png
  cp assets/icon.png assets/favicon.png
fi

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

# Display welcome message with the Fixer icon
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}       🔧 Fixer App 🔧       ${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${BLUE}This script will help you connect the Fixer app to your phone.${NC}"
echo ""
echo -e "1. Make sure your computer and phone are on the same WiFi network"
echo -e "2. Install the ${YELLOW}Expo Go${NC} app on your phone from the app store"
echo -e "   - ${YELLOW}Android:${NC} https://play.google.com/store/apps/details?id=host.exp.exponent"
echo -e "   - ${YELLOW}iOS:${NC} https://apps.apple.com/app/expo-go/id982107779"
echo -e "3. When the QR code appears, scan it with your phone's camera"
echo ""
echo -e "${YELLOW}The app will start on your phone automatically after scanning.${NC}"
echo ""
echo -e "${BLUE}Troubleshooting Tips:${NC}"
echo -e "- If QR code doesn't work, try the ${YELLOW}tunnel${NC} option in Expo Dev Tools"
echo -e "- Make sure your phone and computer are on the same network"
echo -e "- If connection fails, try typing the URL manually in Expo Go"
echo ""
echo -e "${GREEN}Starting Expo development server...${NC}"
echo ""

# Start Expo with options
echo -e "Choose a connection method:"
echo -e "1) ${YELLOW}Local${NC} - Fastest, requires same WiFi network"
echo -e "2) ${YELLOW}Tunnel${NC} - More reliable, works across networks"
echo -e "3) ${YELLOW}LAN${NC} - Local network only"
echo ""
read -p "Select option (1-3) [default: 2]: " option

case $option in
  1)
    echo -e "${GREEN}Starting with local connection...${NC}"
    npx expo start --localhost
    ;;
  3)
    echo -e "${GREEN}Starting with LAN connection...${NC}"
    npx expo start --lan
    ;;
  *)
    echo -e "${GREEN}Starting with tunnel connection (most reliable)...${NC}"
    npx expo start --tunnel
    ;;
esac