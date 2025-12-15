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
    # Wait for it to die
    while kill -0 $PID 2>/dev/null; do 
        sleep 0.5
    done
    echo "💀 Process killed."
else
    echo "ℹ️ No existing process found on port $PORT."
fi

# 4. Start the server in background
echo "▶️ Starting Flask server..."
# Explicitly set FLASK_APP if needed, though app.py is standard
nohup python3 -m flask run --host=0.0.0.0 --port=$PORT > server.log 2>&1 &

# 5. Verification
sleep 3
NEW_PID=$(lsof -t -i:$PORT)
if [ ! -z "$NEW_PID" ]; then
    echo "✅ Server started successfully! (PID: $NEW_PID)"
    echo "🌐 Access URL: http://<YOUR_SERVER_IP>:$PORT"
    echo "📜 Recent Log Output:"
    tail -n 10 server.log
else
    echo "❌ Server failed to start. Showing logs:"
    tail -n 20 server.log
fi
