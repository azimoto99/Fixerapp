#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Clear terminal
clear

# Display welcome message with the Fixer icon
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}       🔧 Fixer App 🔧       ${NC}"
echo -e "${GREEN}=================================${NC}\n"
echo -e "${BLUE}Connect to your phone with Expo Go${NC}"
echo ""

# Generate QR code using the most reliable method
echo -e "Generating QR code for your Replit URL...\n"
node url-qr.js

echo -e "\n${YELLOW}To run this again later, type:${NC} ./expo-connect.sh"
echo -e "${YELLOW}This QR code will work on both Android and iOS devices.${NC}\n"