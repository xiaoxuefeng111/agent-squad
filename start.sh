#!/bin/bash

echo "========================================"
echo "  Agent Squad Startup Script"
echo "========================================"
echo

# Check Node.js
echo "[1/6] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi
NODE_VER=$(node -v)
echo "       Node.js: $NODE_VER [OK]"

# Check npm
echo "[2/6] Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm not found!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi
NPM_VER=$(npm -v)
echo "       npm: $NPM_VER [OK]"

# Check Python and build tools (for better-sqlite3)
echo "[3/6] Checking build tools..."
PYTHON_OK=false
BUILD_OK=false

if command -v python3 &> /dev/null; then
    PY_VER=$(python3 --version 2>&1)
    echo "       $PY_VER found"
    PYTHON_OK=true
elif command -v python &> /dev/null; then
    PY_VER=$(python --version 2>&1)
    echo "       $PY_VER found"
    PYTHON_OK=true
fi

# Check for C compiler (gcc/clang)
if command -v gcc &> /dev/null || command -v clang &> /dev/null; then
    echo "       C compiler found"
    BUILD_OK=true
fi

if [ "$PYTHON_OK" = false ]; then
    echo "[WARNING] Python not found!"
    echo "       better-sqlite3 requires Python for native compilation"
    echo
    echo "       Install Python from: https://www.python.org/downloads/"
    echo "       Or on macOS: brew install python3"
    echo "       Or on Linux: sudo apt install python3"
    echo
fi

if [ "$PYTHON_OK" = true ] && [ "$BUILD_OK" = false ]; then
    echo "[INFO] No C compiler detected"
    echo "       On macOS: xcode-select --install"
    echo "       On Linux: sudo apt install build-essential"
fi

# Check node_modules
echo "[4/6] Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "       Installing dependencies..."

    if [ "$PYTHON_OK" = true ] && [ "$BUILD_OK" = true ]; then
        echo "       Full install with native modules..."
        npm install
    else
        echo "       Install without native compilation..."
        npm install --ignore-scripts
    fi

    if [ $? -ne 0 ]; then
        echo
        echo "[ERROR] npm install failed!"
        echo
        echo "       Manual fix options:"
        echo "       1. Install Python + build tools, then: npm install"
        echo "       2. Or fallback: npm install --ignore-scripts"
        echo
        exit 1
    fi
    echo "       Dependencies installed [OK]"
else
    # Check if better-sqlite3 is compiled
    if [ -d "node_modules/better-sqlite3" ]; then
        if [ ! -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
            echo "[INFO] better-sqlite3 not compiled, database features limited"
            echo "       To fix: npm rebuild better-sqlite3"
        fi
    fi
    echo "       Dependencies [OK]"
fi

# Check .env.local
echo "[5/6] Checking API Key..."
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
    echo "  cp .env.local.example .env.local"
    echo "  Then edit with your API key"
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
echo "[6/6] Starting Server..."
echo
echo "========================================"
echo "  Service URLs"
echo "========================================"
echo
echo "  Web UI: http://localhost:3000"
echo "  WebSocket: ws://localhost:3001"
echo
echo "  First time? Configure API Key in Settings!"
echo "  Press Ctrl+C to stop"
echo "========================================"
echo

npm run dev