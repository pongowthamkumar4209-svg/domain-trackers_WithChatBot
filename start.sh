#!/bin/bash
echo "============================================"
echo " Railroad Clarification Portal - Local Start"
echo "============================================"

# Start Flask backend in background
echo ""
echo "[1/2] Starting Flask backend on http://localhost:5000 ..."
cd "$(dirname "$0")/backend"
python app.py &
FLASK_PID=$!
echo "Flask PID: $FLASK_PID"

# Wait for Flask to start
sleep 2

# Start Vite frontend
echo ""
echo "[2/2] Starting Vite frontend on http://localhost:5173 ..."
cd "$(dirname "$0")"
npm run dev &
VITE_PID=$!

echo ""
echo "Portal: http://localhost:5173"
echo "Demo: admin@railroad.com / admin123"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for both
wait $VITE_PID
kill $FLASK_PID 2>/dev/null
