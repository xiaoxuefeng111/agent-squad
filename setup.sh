#!/bin/bash
# Agent Squad Setup Script
# Handles dependency installation with native module fallbacks

set -e

echo "========================================"
echo "  Agent Squad Setup"
echo "========================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect environment
detect_environment() {
    echo "Detecting build environment..."

    PYTHON_OK=false
    BUILD_OK=false
    PLATFORM=$(uname -s)

    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_OK=true
        echo "  ${GREEN}✓${NC} Python3 found"
    elif command -v python &> /dev/null; then
        PYTHON_OK=true
        echo "  ${GREEN}✓${NC} Python found"
    else
        echo "  ${YELLOW}⚠${NC} Python not found"
    fi

    # Check build tools
    case "$PLATFORM" in
        Darwin)
            if xcode-select -p &> /dev/null; then
                BUILD_OK=true
                echo "  ${GREEN}✓${NC} Xcode tools found"
            else
                echo "  ${YELLOW}⚠${NC} Xcode tools not installed"
                echo "       Run: xcode-select --install"
            fi
            ;;
        Linux)
            if command -v gcc &> /dev/null; then
                BUILD_OK=true
                echo "  ${GREEN}✓${NC} GCC found"
            else
                echo "  ${YELLOW}⚠${NC} GCC not found"
                echo "       Run: sudo apt install build-essential"
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            if command -v cl &> /dev/null; then
                BUILD_OK=true
                echo "  ${GREEN}✓${NC} MSVC found"
            elif command -v gcc &> /dev/null; then
                BUILD_OK=true
                echo "  ${GREEN}✓${NC} MinGW GCC found"
            else
                echo "  ${YELLOW}⚠${NC} No C compiler found"
            fi
            ;;
    esac
}

# Install dependencies
install_deps() {
    echo
    echo "Installing dependencies..."

    if [ "$PYTHON_OK" = true ] && [ "$BUILD_OK" = true ]; then
        echo "Full installation with native modules..."
        npm install
    else
        echo "Fallback installation (skip native compilation)..."
        npm install --ignore-scripts

        # Try to get prebuilt sqlite
        echo
        echo "Attempting to download prebuilt better-sqlite3..."
        npm rebuild better-sqlite3 2>/dev/null || {
            echo "${YELLOW}Warning: better-sqlite3 prebuild not available${NC}"
            echo "Database features will be limited until native build succeeds"
        }
    fi

    echo
    echo "${GREEN}Dependencies installed!${NC}"
}

# Verify installation
verify_install() {
    echo
    echo "Verifying installation..."

    # Check critical modules
    CRITICAL_MODULES=("next" "react" "@anthropic-ai/sdk")

    for module in $CRITICAL_MODULES; do
        if [ -d "node_modules/$module" ]; then
            echo "  ${GREEN}✓${NC} $module installed"
        else
            echo "  ${RED}✗${NC} $module missing!"
            return 1
        fi
    done

    # Check better-sqlite3
    if [ -d "node_modules/better-sqlite3" ]; then
        if [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
            echo "  ${GREEN}✓${NC} better-sqlite3 compiled"
        else
            echo "  ${YELLOW}⚠${NC} better-sqlite3 not compiled (database features limited)"
        fi
    fi

    return 0
}

# Main flow
main() {
    detect_environment

    echo
    if [ "$PYTHON_OK" = true ] && [ "$BUILD_OK" = true ]; then
        echo "${GREEN}Environment ready for full installation${NC}"
    else
        echo "${YELLOW}Environment not fully configured for native modules${NC}"
        echo
        echo "To enable full native compilation:"
        echo "  1. Install Python: https://www.python.org/downloads/"
        case "$PLATFORM" in
            Darwin)  echo "  2. Run: xcode-select --install" ;;
            Linux)   echo "  2. Run: sudo apt install build-essential" ;;
            MINGW*)  echo "  2. Install VS Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/" ;;
        esac
        echo
        read -p "Continue with fallback installation? (Y/n): " CONTINUE
        if [[ "$CONTINUE" =~ ^[Nn]$ ]]; then
            echo "Setup cancelled. Please configure build tools first."
            exit 0
        fi
    fi

    install_deps
    verify_install

    echo
    echo "========================================"
    echo "  Setup Complete!"
    echo "========================================"
    echo
    echo "Next steps:"
    echo "  1. Configure API Key in .env.local or Web UI Settings"
    echo "  2. Run: ./start.sh or npm run dev"
    echo
}

main