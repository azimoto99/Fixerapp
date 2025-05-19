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
echo -e "${GREEN}   🔧 Fixing Vite Configuration 🔧   ${NC}"
echo -e "${GREEN}=================================${NC}\n"

echo -e "${BLUE}Configuring environment for Vite...${NC}\n"

# Create .env file to disable top-level await error
if [ ! -f .env ]; then
  echo -e "Creating .env file with ESBUILD_BINARY_PATH set..."
  echo 'ESBUILD_BINARY_PATH=node_modules/esbuild/bin/esbuild' > .env
fi

# Check if we should use the fixed Vite file
echo -e "${YELLOW}Checking for Vite issues...${NC}\n"
if [ -f server/vite.fixed.ts ]; then
  echo -e "${BLUE}Using fixed Vite configuration...${NC}"
  # Create temporary backup of the original file if it doesn't exist
  if [ ! -f server/vite.original.ts ]; then
    cp server/vite.ts server/vite.original.ts
    echo -e "Original Vite configuration backed up to server/vite.original.ts"
  fi
  
  # Replace with our fixed version
  cp server/vite.fixed.ts server/vite.ts
  echo -e "Replaced server/vite.ts with fixed version"
fi

# Set environment variable for this session
export ESBUILD_BINARY_PATH=node_modules/esbuild/bin/esbuild
export NODE_OPTIONS="--experimental-vm-modules"
export VITE_CJS_IGNORE_WARNING=true

echo -e "${YELLOW}Starting application with fixed configuration...${NC}\n"
NODE_ENV=development tsx server/index.ts

echo -e "\n${GREEN}Done!${NC}"