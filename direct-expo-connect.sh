#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Clear terminal
clear

# Use the live production domain
LIVE_URL="https://fixer.gg"

echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}   🔧 Direct Expo Connection 🔧   ${NC}"
echo -e "${GREEN}=================================${NC}\n"

echo -e "${BLUE}Live URL:${NC} $LIVE_URL"
echo -e "${BLUE}Starting direct Expo connection...${NC}\n"

# Generate direct Expo URLs in different formats for maximum compatibility
EXPO_URL="exp://fixer.gg"
EXPO_URL_CLEAN="exp://fixer.gg"
EXPO_APP_URL="exp+fixer://expo-development-client/?url=${LIVE_URL}"

# Create a simple HTML page with redirect
cat > expo-redirect.html << EOL
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to Expo</title>
  <meta http-equiv="refresh" content="0; URL='${EXPO_APP_URL}'">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 2em; text-align: center; background: #f9f9f9; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 2em; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; }
    .url { background: #f0f0f0; padding: 1em; border-radius: 4px; word-break: break-all; margin: 1em 0; }
    .button { display: inline-block; background: #4a9; color: white; padding: 0.5em 1em; text-decoration: none; border-radius: 4px; margin-top: 1em; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔧 Connect to Fixer App</h1>
    <p>If you're not automatically redirected, tap the button below or manually open one of these URLs in Expo Go:</p>
    
    <p><strong>Option 1:</strong></p>
    <div class="url">${EXPO_APP_URL}</div>
    
    <p><strong>Option 2:</strong></p>
    <div class="url">${EXPO_URL_CLEAN}</div>
    
    <p><a class="button" href="${EXPO_APP_URL}">Open in Expo Go</a></p>
  </div>
</body>
</html>
EOL

echo -e "Generated expo-redirect.html with connection options."
REDIRECT_URL="${LIVE_URL}/expo-redirect.html"
echo -e "Access this URL on your mobile device: ${YELLOW}${REDIRECT_URL}${NC}\n"

# Generate QR code for the redirect URL
echo -e "Generating QR code for easy connection...\n"
if command -v qrencode &> /dev/null; then
  qrencode -t ASCII -o - "${REDIRECT_URL}"
else
  # Use node to generate QR if available
  node -e "const QRCode = require('qrcode'); QRCode.toString('${REDIRECT_URL}', {type:'terminal'}, (err, code) => { console.log(code) });" 2>/dev/null || echo "QR code generation not available. Please install qrencode or the qrcode npm package."
fi

echo -e "\n${BLUE}Connection Instructions:${NC}"
echo -e "1. Open ${YELLOW}${REDIRECT_URL}${NC} on your mobile device"
echo -e "2. Tap 'Open in Expo Go' when prompted"
echo -e "3. If that doesn't work, copy one of the URLs and enter it manually in Expo Go\n"

echo -e "${BLUE}Troubleshooting:${NC}"
echo -e "- If the connection fails, make sure your phone and computer are on the same network"
echo -e "- Try both URL formats shown in the redirect page"
echo -e "- On iOS, you may need to open the URL in Safari first, then tap 'Open in Expo Go'\n"

echo -e "${GREEN}Ready for connection!${NC}"
echo -e "To run this again, type: ${YELLOW}./direct-expo-connect.sh${NC}\n"