#!/bin/bash

# Function to start health check server in case main server fails
start_health_check_server() {
  echo "Starting health check server (fallback)..."
  NODE_ENV=production node dist/health-check.js
}

# Start the main server
echo "Starting main application server..."
NODE_ENV=production node dist/index.js || start_health_check_server