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
echo -e "${GREEN}   🔧 Fixer + Expo Go Setup 🔧   ${NC}"
echo -e "${GREEN}=================================${NC}\n"

# Get the Replit URL
REPLIT_URL=$(node -e "const url = process.env.REPL_SLUG ? \`https://\${process.env.REPL_SLUG}.\${process.env.REPL_OWNER}.repl.co\` : 'https://your-replit-url.repl.co'; console.log(url);")

echo -e "${BLUE}Setting up Fixer app for Expo Go...${NC}\n"

# Generate QR code
echo -e "Generating connection QR code...\n"
node url-qr.js

echo -e "\n${YELLOW}Instructions for connecting with Expo Go:${NC}"
echo -e "1. Install Expo Go on your mobile device from the app store"
echo -e "2. Open Expo Go and scan the QR code above"
echo -e "3. If that doesn't work, try entering one of the provided URLs manually"
echo -e "4. For best results, make sure your phone and computer are on the same network\n"

echo -e "${BLUE}Troubleshooting:${NC}"
echo -e "- If the connection fails, try restarting your Replit server"
echo -e "- Check that your Expo Go app is up to date"
echo -e "- On iOS, you may need to open the URL in Safari first, then 'Open in Expo Go'\n"

echo -e "${GREEN}Happy coding!${NC}"
echo -e "To run this setup again, type: ${YELLOW}./expo-go-connect.sh${NC}\n"