#!/bin/bash
set -e

# Add a trap to ensure fallback health server starts if main process fails
trap 'start_health_check_server' ERR EXIT

# Function to start health check server in case main server fails
start_health_check_server() {
  echo "Starting health check server (fallback)..."
  NODE_ENV=production node dist/health-check.js
}

# Prepare the environment
echo "Setting environment for production..."
export NODE_ENV=production

# Start the health monitoring script in the background
echo "Starting health monitoring..."
bash ./health-monitor.sh &

# Start the main server
echo "Starting main application server..."
exec node dist/index.js