#!/bin/bash
# Script to kill processes using port 5000

PORT=5000
echo "Checking for processes using port $PORT..."

# Kill nodemon and node processes related to server
pkill -f "nodemon.*index.js" 2>/dev/null
pkill -f "node.*server/index.js" 2>/dev/null

# Wait a moment
sleep 1

# Kill any remaining processes on the port
PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "✅ No processes found using port $PORT"
    echo "Port is now free. You can start the server with: npm run dev"
else
    echo "Found processes: $PIDS"
    echo "Killing processes..."
    kill -9 $PIDS 2>/dev/null
    sleep 1
    echo "✅ Processes killed"
    echo "Port is now free. You can start the server with: npm run dev"
fi
