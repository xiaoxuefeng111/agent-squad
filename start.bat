@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Agent Squad Startup Script
echo ========================================
echo.

REM Step 1: Check Node.js
echo [1/5] Checking Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install from: https://nodejs.org/
    pause
    exit /b 1
)
for /f %%i in ('node -v') do echo        Node.js: %%i [OK]

REM Step 2: Check npm
echo [2/5] Checking npm...
npm -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)
for /f %%i in ('npm -v') do echo        npm: %%i [OK]

REM Step 3: Check Python (optional, for better-sqlite3)
echo [3/5] Checking Python (optional)...
set PYTHON_OK=0
python --version >nul 2>&1
if errorlevel 1 (
    echo        Python: NOT FOUND
    echo.
    echo        [INFO] Python is optional but recommended for database features.
    echo        Without Python, the app will use in-memory storage (data lost on restart).
    echo.
    echo        To install Python:
    echo        1. Download from: https://www.python.org/downloads/
    echo        2. Check "Add Python to PATH" during installation
    echo        3. Run: npm rebuild better-sqlite3
    echo.
) else (
    for /f %%i in ('python --version') do (
        echo        %%i [OK]
        set PYTHON_OK=1
    )
)

REM Step 4: Check dependencies
echo [4/5] Checking dependencies...
if not exist "node_modules" (
    echo        Installing...
    if !PYTHON_OK! equ 1 (
        npm install
    ) else (
        echo        [INFO] Using fallback install (skip native compilation)
        npm install --ignore-scripts
    )
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
    echo        Installed [OK]
) else (
    echo        OK
)

REM Step 5: Check API Key
echo [5/5] Checking API Key...
if not exist ".env.local" (
    echo        [WARNING] Not configured
    echo        Configure in Web UI Settings after startup
) else (
    echo        OK
)

echo.
echo ========================================
echo   Starting Server...
echo ========================================
echo.
echo   URL: http://localhost:3000
echo   Press Ctrl+C to stop
echo ========================================
echo.

npm run dev