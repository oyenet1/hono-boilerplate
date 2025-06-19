#!/bin/bash

echo "🧪 Testing Health Endpoint with Console Logging"
echo "=============================================="

# Start the development server in background
echo "📡 Starting development server..."
bun run dev &
DEV_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 3

echo ""
echo "🔍 Making health check request..."
echo "You should see detailed console logs above from the health checker:"
echo ""

# Make the health check request
curl -s http://localhost:3002/api/health | jq . 2>/dev/null || curl -s http://localhost:3002/api/health

echo ""
echo ""
echo "✅ Health check complete!"
echo "🛑 Stopping development server..."

# Kill the development server
kill $DEV_PID 2>/dev/null

echo "✨ Test finished!"
