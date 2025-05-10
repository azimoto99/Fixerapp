#!/bin/bash

# More reliable startup script with proper signal handling
# This script is wrapped by pid1-wrapper.js when in a containerized environment

# Prepare the environment
echo "Setting environment for production..."
export NODE_ENV=production

# Create a named pipe for communication between parent and child processes
PIPE="/tmp/health_pipe"
[ -p "$PIPE" ] || mkfifo "$PIPE"

# PID for main application server
MAIN_PID=""
# PID for health monitor
MONITOR_PID=""
# PID for health server (fallback)
HEALTH_PID=""

# Function to clean up all child processes before exit
cleanup() {
  echo "Cleanup: Terminating all processes..."
  
  # Kill the main application if it's running
  if [ -n "$MAIN_PID" ] && kill -0 $MAIN_PID 2>/dev/null; then
    echo "Terminating main application (PID: $MAIN_PID)"
    kill -TERM $MAIN_PID 2>/dev/null || true
  fi
  
  # Kill the health monitor if it's running
  if [ -n "$MONITOR_PID" ] && kill -0 $MONITOR_PID 2>/dev/null; then
    echo "Terminating health monitor (PID: $MONITOR_PID)"
    kill -TERM $MONITOR_PID 2>/dev/null || true
  fi
  
  # Kill the health server if it's running
  if [ -n "$HEALTH_PID" ] && kill -0 $HEALTH_PID 2>/dev/null; then
    echo "Terminating health server (PID: $HEALTH_PID)"
    kill -TERM $HEALTH_PID 2>/dev/null || true
  fi
  
  # Remove the named pipe
  [ -p "$PIPE" ] && rm -f "$PIPE"
  
  exit 0
}

# Function to start health check server
start_health_check_server() {
  echo "Starting health check server (fallback)..."
  # Run fallback health check server in the background
  node dist/health-check.js &
  HEALTH_PID=$!
  echo "Health check server started with PID: $HEALTH_PID"
}

# Set up signal handling
trap cleanup INT TERM

# Start the health monitoring script in the background
echo "Starting health monitoring..."
bash ./health-monitor.sh &
MONITOR_PID=$!
echo "Health monitor started with PID: $MONITOR_PID"

# Start the main server
echo "Starting main application server..."
node dist/index.js &
MAIN_PID=$!
echo "Main application started with PID: $MAIN_PID"

# Wait for main process to exit
wait $MAIN_PID 2>/dev/null

# If we get here, the main process has exited
echo "Main application exited, starting health check server..."
start_health_check_server

# Keep the script running to maintain the health server
# This is crucial for preventing PID1 stalling issues
while true; do
  # Check if health server is still running
  if [ -n "$HEALTH_PID" ] && ! kill -0 $HEALTH_PID 2>/dev/null; then
    echo "Health check server exited, restarting..."
    start_health_check_server
  fi
  
  # Sleep to avoid CPU spinning
  sleep 5
done