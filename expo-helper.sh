#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear

echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}       🔧 Fixer App 🔧       ${NC}"
echo -e "${GREEN}=================================${NC}\n"
echo -e "${BLUE}Improved Expo Connection Helper${NC}"
echo ""
echo -e "Starting the Expo helper server...\n"

# Run the Node.js server script
node expo-fix.js

echo -e "\n${YELLOW}If Expo Go isn't working, try these troubleshooting steps:${NC}"
echo -e "1. Make sure your Replit app is running (the Start application workflow)"
echo -e "2. Try manually entering the URL shown above in Expo Go"
echo -e "3. Check if your phone and computer are on the same network"
echo -e "4. Try using mobile data instead of WiFi"
echo -e "5. Clear the cache in Expo Go (Settings > Clear Cache)"