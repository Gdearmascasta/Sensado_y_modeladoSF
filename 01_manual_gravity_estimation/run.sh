#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Manual Gravity Estimation App ===${NC}"

# Start Backend
echo -e "${GREEN}[+] Starting Backend (FastAPI on port 8001)...${NC}"
cd backend
if [ ! -d ".venv" ]; then
    echo -e "${BLUE}    Creating virtual environment...${NC}"
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
python main.py &
BACKEND_PID=$!

# Go back to root
cd ..

# Start Frontend
echo -e "${GREEN}[+] Starting Frontend (Vite/React on port 5173)...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!

echo -e "${BLUE}=== App is running! Press Ctrl+C to stop ===${NC}"

# Cleanup function to kill processes on exit
cleanup() {
    echo -e "${BLUE}\nStopping services...${NC}"
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit 0
}

# Catch Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM EXIT

# Keep script running
wait
