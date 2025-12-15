#!/bin/bash

# Configuration
PORT=5000
BRANCH="main"

echo "🚀 Starting Deployment on Port $PORT..."

# 1. Pull latest code
echo "📥 Pulling latest code from git..."
git pull origin $BRANCH

# 2. Install dependencies (if needed)
# echo "📦 Installing requirements..."
# pip install -r requirements.txt

# 3. Find and Kill existing process on the port
PID=$(lsof -t -i:$PORT)
if [ ! -z "$PID" ]; then
    echo "🛑 Killing existing process (PID: $PID)..."
    kill -9 $PID
else
    echo "ℹ️ No existing process found on port $PORT."
fi

# 4. Start the server in background
echo "▶️ Starting Flask server..."
nohup python3 -m flask run --host=0.0.0.0 --port=$PORT > server.log 2>&1 &

# 5. Verification
sleep 2
NEW_PID=$(lsof -t -i:$PORT)
if [ ! -z "$NEW_PID" ]; then
    echo "✅ Server started successfully! (PID: $NEW_PID)"
    echo "🌐 Access URL: http://<YOUR_SERVER_IP>:$PORT"
else
    echo "❌ Server failed to start. Check server.log for details."
fi
