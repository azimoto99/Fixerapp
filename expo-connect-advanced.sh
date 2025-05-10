#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Clear terminal
clear

# Header
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}    🔧 Fixer App - Advanced    ${NC}"
echo -e "${GREEN}=================================${NC}\n"
echo -e "${BLUE}Advanced Expo Go Connection${NC}"
echo -e "This script provides multiple connection options for maximum compatibility\n"

# Run the direct connection script
echo -e "${CYAN}Generating multiple connection options...${NC}\n"
node expo-connect-direct.js

# Footer
echo -e "\n${YELLOW}To run this advanced connector again, type:${NC} ./expo-connect-advanced.sh"
echo -e "${YELLOW}To use the standard connector instead, type:${NC} ./expo-connect.sh\n"