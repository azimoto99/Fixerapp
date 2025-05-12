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
echo -e "${GREEN}   📦 Fixing Metro Dependencies 📦   ${NC}"
echo -e "${GREEN}=================================${NC}\n"

echo -e "${BLUE}Installing all required Metro dependencies...${NC}\n"

# Install all the Metro packages needed by Expo
yarn add metro metro-cache metro-config metro-core metro-resolver metro-runtime

echo -e "\n${GREEN}Metro dependencies installed!${NC}\n"

echo -e "${YELLOW}Next steps:${NC}\n"
echo -e "1. Run ${GREEN}./launch-expo.sh${NC} to start Expo with the fixed configuration"
echo -e "2. Or connect directly using ${GREEN}./expo-go-direct.sh${NC}\n"

echo -e "${BLUE}Troubleshooting:${NC}"
echo -e "If you encounter more dependency issues, check the error message for the specific missing package"
echo -e "and install it using: ${GREEN}yarn add [package-name]${NC}\n"