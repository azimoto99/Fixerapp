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
echo -e "${GREEN}   📱 Expo Go Direct Connection 📱   ${NC}"
echo -e "${GREEN}=================================${NC}\n"

# Set the domain directly
DOMAIN="fixer.gg"

echo -e "${BLUE}Domain:${NC} ${DOMAIN}\n"

echo -e "${YELLOW}Expo Go Connection URLs:${NC}\n"
echo -e "Method 1 (Recommended):"
echo -e "${GREEN}exp://${DOMAIN}${NC}\n"

echo -e "Method 2 (Custom Scheme):"
echo -e "${GREEN}exp+fixer://expo-development-client/?url=https://${DOMAIN}${NC}\n"

echo -e "${YELLOW}Instructions:${NC}\n"
echo -e "1. Open Expo Go on your mobile device"
echo -e "2. Tap 'Enter URL' and paste one of the URLs above"
echo -e "3. Or visit ${GREEN}https://${DOMAIN}/expo-redirect.html${NC} on your mobile\n"

echo -e "${BLUE}Troubleshooting:${NC}"
echo -e "- Make sure your app is deployed to ${DOMAIN}"
echo -e "- Check that the Expo redirect page exists at ${DOMAIN}/expo-redirect.html"
echo -e "- Ensure you've added Expo Go permissions for your domain in Firebase console\n"