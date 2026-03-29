#!/bin/bash

echo "========================================"
echo "  Agent Squad Startup Script"
echo "========================================"
echo

# Check Node.js
echo "[1/4] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi
NODE_VER=$(node -v)
echo "       Node.js: $NODE_VER [OK]"

# Check npm
echo "[2/4] Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm not found!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi
NPM_VER=$(npm -v)
echo "       npm: $NPM_VER [OK]"

# Check node_modules
echo "[3/4] Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "       node_modules not found, installing..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies!"
        exit 1
    fi
    echo "       Dependencies installed [OK]"
else
    echo "       Dependencies [OK]"
fi

# Check .env.local
echo "[4/4] Checking API Key..."
if [ ! -f ".env.local" ]; then
    echo
    echo "========================================"
    echo "  [WARNING] API Key not configured!"
    echo "========================================"
    echo
    echo "Please set your Claude API Key:"
    echo "  1. Open the Web UI: http://localhost:3000"
    echo "  2. Click 'Settings' button"
    echo "  3. Enter your API Key"
    echo
    echo "Or create .env.local file manually:"
    echo "  echo 'ANTHROPIC_API_KEY=sk-ant-xxx' > .env.local"
    echo
    echo "Get API Key from: https://console.anthropic.com/settings/keys"
    echo "========================================"
    echo
    read -p "Continue anyway? (y/N): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        exit 0
    fi
else
    echo "       API Key configured [OK]"
fi

echo
echo "========================================"
echo "  Starting Server..."
echo "========================================"
echo
echo "  Web UI: http://localhost:3000"
echo "  WebSocket: ws://localhost:3001"
echo
echo "  Press Ctrl+C to stop"
echo "========================================"
echo

npm run dev