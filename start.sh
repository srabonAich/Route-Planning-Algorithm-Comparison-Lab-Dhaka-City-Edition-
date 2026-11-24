#!/bin/bash

# Route Planning & Algorithm Comparison Lab - Startup Script
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo " Starting Route Planning & Algorithm Comparison Lab..."
echo "=========================================================="

# Determine Python / Uvicorn executable
if [ -f "$DIR/backend/venv/bin/uvicorn" ]; then
    UVICORN_CMD="$DIR/backend/venv/bin/uvicorn"
elif [ -f "$DIR/venv/bin/uvicorn" ]; then
    UVICORN_CMD="$DIR/venv/bin/uvicorn"
elif command -v uvicorn >/dev/null 2>&1; then
    UVICORN_CMD="uvicorn"
else
    echo "Creating virtual environment in backend/venv..."
    python3 -m venv "$DIR/backend/venv"
    "$DIR/backend/venv/bin/pip" install -r "$DIR/requirements.txt"
    UVICORN_CMD="$DIR/backend/venv/bin/uvicorn"
fi

# 1. Start FastAPI Backend in background
echo "-> Starting Backend on http://127.0.0.1:8000 ..."
$UVICORN_CMD backend.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Function to clean up background processes on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 2. Start Vite Frontend
echo "-> Starting Frontend on http://127.0.0.1:5173 ..."
cd "$DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run dev
