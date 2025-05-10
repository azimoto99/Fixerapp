#!/bin/bash

# Test script for health check mechanism
# This will help verify that our health check and process management is working correctly

echo "Testing health check mechanism..."

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to check health endpoint
check_health() {
  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-5000}/health 2>/dev/null || echo "000")
  if [ "$response" == "200" ]; then
    echo -e "${GREEN}Health check passed: $response${NC}"
    return 0
  else
    echo -e "${RED}Health check failed: $response${NC}"
    return 1
  fi
}

# Check if the app is already running
if check_health; then
  echo -e "${GREEN}Application is already running and healthy${NC}"
else
  echo -e "${YELLOW}Application is not running or not healthy, starting it...${NC}"
  
  # Start the app in the background
  NODE_ENV=development npm run dev &
  APP_PID=$!
  
  echo "Application started with PID: $APP_PID"
  
  # Wait for app to start
  echo -e "${YELLOW}Waiting for application to start...${NC}"
  
  for i in {1..10}; do
    if check_health; then
      echo -e "${GREEN}Application started successfully${NC}"
      break
    fi
    
    if [ $i -eq 10 ]; then
      echo -e "${RED}Application failed to start within timeout${NC}"
      exit 1
    fi
    
    echo -e "${YELLOW}Waiting for application to start (attempt $i/10)...${NC}"
    sleep 2
  done
fi

# Now simulate application crash
echo ""
echo -e "${YELLOW}Simulating application crash...${NC}"

MAIN_PID=$(ps aux | grep "node " | grep -v grep | grep -v "health-check" | head -1 | awk '{print $2}')

if [ -z "$MAIN_PID" ]; then
  echo -e "${RED}Could not find application process${NC}"
  exit 1
fi

echo "Found application PID: $MAIN_PID"
echo -e "${YELLOW}Killing application process...${NC}"

kill -9 $MAIN_PID

echo -e "${YELLOW}Waiting for health check server to start...${NC}"

# Give it a moment to restart
sleep 5

# Check if health check server is running
if check_health; then
  echo -e "${GREEN}Health check server started successfully after application crash${NC}"
  echo -e "${GREEN}TEST PASSED: Health check mechanism is working as expected${NC}"
else
  echo -e "${RED}Health check server failed to start after application crash${NC}"
  echo -e "${RED}TEST FAILED: Health check mechanism is not working correctly${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}All tests completed successfully!${NC}"