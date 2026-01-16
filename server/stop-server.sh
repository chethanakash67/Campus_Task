#!/bin/bash
# Script to stop all Node.js and nodemon processes

echo "Stopping all Node.js processes..."

# Kill nodemon processes
pkill -9 -f nodemon 2>/dev/null

# Kill node processes on port 5000
lsof -ti:5000 | xargs kill -9 2>/dev/null

# Wait
sleep 2

# Check if port is free
if lsof -ti:5000 > /dev/null 2>&1; then
    echo "⚠️  Port 5000 still in use. Trying to kill remaining processes..."
    lsof -ti:5000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Final check
if lsof -ti:5000 > /dev/null 2>&1; then
    echo "❌ Port 5000 is still in use."
    echo "   Run this command to see what's using it: lsof -i:5000"
else
    echo "✅ Port 5000 is now FREE"
    echo "   You can now start the server with: npm run dev"
fi
