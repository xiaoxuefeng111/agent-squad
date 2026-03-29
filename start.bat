@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Agent Squad Startup Script
echo ========================================
echo.

REM Check Node.js
echo [1/4] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo        Node.js: %NODE_VER% [OK]

REM Check npm
echo [2/4] Checking npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo        npm: %NPM_VER% [OK]

REM Check node_modules
echo [3/4] Checking dependencies...
if not exist "node_modules" (
    echo        node_modules not found, installing...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo        Dependencies installed [OK]
) else (
    echo        Dependencies [OK]
)

REM Check .env.local
echo [4/4] Checking API Key...
if not exist ".env.local" (
    echo.
    echo ========================================
    echo   [WARNING] API Key not configured!
    echo ========================================
    echo.
    echo Please set your Claude API Key:
    echo   1. Open the Web UI: http://localhost:3000
    echo   2. Click "Settings" button
    echo   3. Enter your API Key
    echo.
    echo Or create .env.local file manually:
    echo   echo ANTHROPIC_API_KEY=sk-ant-xxx ^> .env.local
    echo.
    echo Get API Key from: https://console.anthropic.com/settings/keys
    echo ========================================
    echo.
    set /p CONTINUE="Continue anyway? (Y/N): "
    if /i "!CONTINUE!" neq "Y" exit /b 0
) else (
    echo        API Key configured [OK]
)

echo.
echo ========================================
echo   Starting Server...
echo ========================================
echo.
echo   Web UI: http://localhost:3000
echo   WebSocket: ws://localhost:3001
echo.
echo   Press Ctrl+C to stop
echo ========================================
echo.

npm run dev