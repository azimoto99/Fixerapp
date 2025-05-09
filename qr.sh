#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the Replit URL from the environment or use a default
REPLIT_URL=$(echo "$REPLIT_DEPLOYMENT_URL" | sed 's/https:\/\///')
if [ -z "$REPLIT_URL" ]; then
  # Try to get from .replit file
  REPLIT_URL=$(grep -o 'hostname = "[^"]*"' .replit 2>/dev/null | sed 's/hostname = "//;s/"//')
fi

if [ -z "$REPLIT_URL" ]; then
  # If still empty, use a generic one that users will need to replace
  REPLIT_URL="your-repl-name.username.repl.co"
  echo -e "${YELLOW}Couldn't detect your Replit URL automatically.${NC}"
  echo -e "${YELLOW}Replace the following URL with your actual Replit URL.${NC}"
fi

# Create a URL for Expo
EXPO_URL="exp://$REPLIT_URL"

# Create ASCII QR code in terminal
echo -e "\n${GREEN}==================================${NC}"
echo -e "${GREEN}       🔧 Fixer App 🔧        ${NC}"
echo -e "${GREEN}==================================${NC}\n"
echo -e "Scan this QR code with the ${YELLOW}Expo Go app${NC} on your phone:"
echo -e "(Or manually enter the URL below in Expo Go)\n"

# Generate QR with Node or use ASCII art fallback
if command -v node &> /dev/null && [ -e node_modules/qrcode ]; then
  node -e "import('qrcode').then(QRCode => { QRCode.toString('$EXPO_URL', { type: 'terminal', small: true }, (err, code) => { console.log(code) }) });"
else
  # ASCII art QR code (simplified version)
  echo -e "▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄"
  echo -e "█ ▄▄▄ █   █ ▄▄▄ █ █"
  echo -e "█ ███ █ █ █ ███ █ █"
  echo -e "█▄▄▄▄▄█ █ █▄▄▄▄▄█ █"
  echo -e "▄▄▄▄▄▄▄ █ ▄ ▄ ▄ ▄▄█"
  echo -e "█ ▄▄▄ █ ▄▄█▄█▄▄█  "
  echo -e "█ ███ █  ▄█▄▄▄█▄▄█"
  echo -e "█▄▄▄▄▄█ █ ▄▄▄ ▄▄▄█"
  echo -e "▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄"
fi

echo -e "\n${BLUE}URL for Expo Go:${NC}"
echo -e "${YELLOW}$EXPO_URL${NC}\n"

echo -e "${BLUE}How to use:${NC}"
echo -e "1. Install the ${YELLOW}Expo Go${NC} app on your phone"
echo -e "   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent"
echo -e "   - iOS: https://apps.apple.com/app/expo-go/id982107779"
echo -e "2. Open the app and select \"Scan QR Code\" or \"Enter URL\""
echo -e "3. Scan the QR code above or manually enter the URL\n"