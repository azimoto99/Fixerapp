#!/bin/bash

# Health monitor script to ensure the application health endpoint is always responding
# This script will check the health endpoint and start the fallback health check server if needed

# Configuration
HEALTH_CHECK_URL="http://localhost:${PORT:-5000}/health"
MAX_RETRIES=3
RETRY_INTERVAL=5  # seconds

# Function to check health endpoint
check_health() {
  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL)
  if [ "$response" == "200" ]; then
    echo "Health check passed: $response"
    return 0
  else
    echo "Health check failed: $response"
    return 1
  fi
}

# Function to start fallback health check server
start_fallback_server() {
  echo "Starting fallback health check server..."
  NODE_ENV=production node dist/health-check.js &
  echo "Fallback health check server started with PID $!"
}

# Main monitoring loop
monitor_health() {
  local retry_count=0

  while true; do
    if check_health; then
      # Reset retry count on successful health check
      retry_count=0
    else
      # Increment retry count on failure
      retry_count=$((retry_count + 1))
      
      # If we've reached max retries, start fallback server
      if [ $retry_count -ge $MAX_RETRIES ]; then
        echo "Health check failed $retry_count times, starting fallback server"
        start_fallback_server
        break
      fi
    fi
    
    # Wait before next check
    sleep $RETRY_INTERVAL
  done
}

# Start monitoring in the background
monitor_health &
echo "Health monitoring started with PID $!"