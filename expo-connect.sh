#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Clear terminal
clear

# Display welcome message with the Fixer icon
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}       🔧 Fixer App 🔧       ${NC}"
echo -e "${GREEN}=================================${NC}\n"
echo -e "${BLUE}Connect to your phone with Expo Go${NC}"
echo ""

# Make sure the server is running
echo -e "${CYAN}✓ Checking if server is running...${NC}"
if ! curl -s http://localhost:5000 > /dev/null; then
  echo -e "${RED}⚠ Server doesn't seem to be running!${NC}"
  echo -e "${YELLOW}Make sure to start the server with the 'Start application' workflow.${NC}"
  echo -e "Continuing anyway...\n"
else
  echo -e "${GREEN}✓ Server is running!${NC}\n"
fi

# Generate QR code using the most reliable method
echo -e "Generating QR codes for your Replit URL...\n"
node url-qr.js

echo -e "\n${GREEN}Troubleshooting tips:${NC}"
echo -e "1. ${YELLOW}Make sure Expo Go is installed on your device${NC}"
echo -e "2. ${YELLOW}Try both QR codes provided above${NC}"
echo -e "3. ${YELLOW}Ensure both your phone and Replit are on the same network${NC}"
echo -e "4. ${YELLOW}For Android, try toggling between 'LAN' and 'Tunnel' in Expo settings${NC}"
echo -e "5. ${YELLOW}Try entering the URL manually in Expo Go${NC}"

echo -e "\n${BLUE}To run this connector again later, type:${NC} ./expo-connect.sh\n"