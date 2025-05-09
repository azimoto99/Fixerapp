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
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${BLUE}Quick Connect Guide for the Fixer App${NC}"
echo ""
echo -e "To connect to your phone without installing Expo, follow these steps:"
echo ""
echo -e "1. Install the ${YELLOW}Expo Go${NC} app on your phone:"
echo -e "   - ${YELLOW}Android:${NC} https://play.google.com/store/apps/details?id=host.exp.exponent"
echo -e "   - ${YELLOW}iOS:${NC} https://apps.apple.com/app/expo-go/id982107779"
echo ""
echo -e "2. Open the Expo Go app and select ${YELLOW}\"Scan QR Code\"${NC}"
echo ""
echo -e "3. Open this Replit project in your browser and look for the ${YELLOW}\"Open in a new tab\"${NC}"
echo -e "   button in the webview (top right corner of the preview window)"
echo ""
echo -e "4. ${YELLOW}Copy the URL${NC} from the new tab's address bar"
echo ""
echo -e "5. In the Expo Go app, choose the option to ${YELLOW}enter URL manually${NC}"
echo -e "   and paste the URL, but ${RED}change the protocol${NC} from 'https://' to 'exp://'"
echo ""
echo -e "   Example: If your URL is:"
echo -e "   ${YELLOW}https://fixer-app.yourname.repl.co${NC}"
echo ""
echo -e "   Enter this in Expo Go:"
echo -e "   ${GREEN}exp://fixer-app.yourname.repl.co${NC}"
echo ""
echo -e "${BLUE}Troubleshooting Tips:${NC}"
echo -e "- Make sure your phone has an internet connection"
echo -e "- Try using a mobile data connection instead of WiFi if connection fails"
echo -e "- If the app doesn't load, check that you've correctly changed 'https://' to 'exp://'"
echo ""