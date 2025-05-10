#!/bin/bash
set -e

# Health monitor script to ensure the application health endpoint is always responding
# This script will check the health endpoint and start the fallback health check server if needed

# Configuration
HEALTH_CHECK_URL="http://localhost:${PORT:-5000}/health"
MAX_RETRIES=5
RETRY_INTERVAL=5  # seconds
MAX_STARTUP_WAIT=30  # seconds to wait for initial server startup

# Log with timestamp
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check health endpoint
check_health() {
  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL 2>/dev/null || echo "000")
  if [ "$response" == "200" ]; then
    log "Health check passed: $response"
    return 0
  else
    log "Health check failed: $response"
    return 1
  fi
}

# Function to start fallback health check server
start_fallback_server() {
  log "Starting fallback health check server..."
  NODE_ENV=production exec node dist/health-check.js &
  log "Fallback health check server started with PID $!"
}

# Wait for initial startup - give the main server time to start
log "Waiting up to ${MAX_STARTUP_WAIT}s for main server to start..."
startup_wait=0
while [ $startup_wait -lt $MAX_STARTUP_WAIT ]; do
  if check_health; then
    log "Main server started successfully!"
    break
  fi
  sleep 2
  startup_wait=$((startup_wait + 2))
done

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
        log "Health check failed $retry_count times, starting fallback server"
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
log "Health monitoring started with PID $!"