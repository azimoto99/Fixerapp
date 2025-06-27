#!/bin/bash

# Fixer MVP Server Startup Script
echo "🚀 Starting Fixer MVP Server..."

# Kill any existing processes
echo "Stopping existing processes..."
pkill -f "tsx server/index.ts" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
sleep 2

# Start the server
echo "Starting development server..."
npm run dev > dev-server.log 2>&1 &
SERVER_PID=$!

echo "Server PID: $SERVER_PID"
echo "Waiting for server to start..."

# Wait for server to be ready
for i in {1..30}; do
    if curl -s http://localhost:5000/api/jobs > /dev/null 2>&1; then
        echo "✅ Server is ready!"
        echo "Server logs: tail -f dev-server.log"
        echo "Test API: curl http://localhost:5000/api/jobs"
        echo "Frontend: http://localhost:5000"
        exit 0
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

echo "❌ Server failed to start within 60 seconds"
echo "Check logs: cat dev-server.log"
exit 1
