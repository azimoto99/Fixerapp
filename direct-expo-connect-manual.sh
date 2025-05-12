#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Clear terminal
clear

echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}  🔧 Expo Connection Details 🔧   ${NC}"
echo -e "${GREEN}=================================${NC}\n"

echo -e "${BLUE}Live domain:${NC} fixer.gg\n"

echo -e "${YELLOW}To connect with Expo Go:${NC}\n"
echo -e "1. Open Expo Go on your mobile device"
echo -e "2. Tap 'Enter URL manually'"
echo -e "3. Enter: ${GREEN}exp://fixer.gg${NC}\n"

echo -e "${YELLOW}Alternate method:${NC}\n"
echo -e "1. Visit ${GREEN}https://fixer.gg/expo-redirect.html${NC} on your mobile device"
echo -e "2. Tap the 'Open in Expo Go' button"
echo -e "3. Or use one of the connection methods shown on that page\n"

echo -e "${YELLOW}For Expo Development Client:${NC}\n"
echo -e "Enter: ${GREEN}exp+fixer://expo-development-client/?url=https://fixer.gg${NC}\n"

echo -e "${GREEN}These connection URLs use the production domain fixer.gg${NC}"
echo -e "${GREEN}Make sure the app is deployed to the live domain before connecting${NC}\n"