@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Agent Squad Startup Script
echo ========================================
echo.

REM Kill old node processes
echo [1/5] Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo        Done [OK]

REM Check Node.js
echo [2/5] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo        Node.js: %%i [OK]

REM Check npm
echo [3/5] Checking npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do echo        npm: %%i [OK]

REM Check dependencies
echo [4/5] Checking dependencies...
if not exist "node_modules" (
    echo        Installing...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
)
echo        Dependencies [OK]

REM Check API Key
echo [5/5] Checking API Key...
if not exist ".env.local" (
    echo        [WARNING] Not configured
    echo        Configure in Web UI Settings after startup
) else (
    echo        Configured [OK]
)

echo.
echo ========================================
echo   Starting Server...
echo ========================================
echo.
echo   Check the output below for the actual URL
echo   Usually: http://localhost:3000
echo.
echo   Press Ctrl+C to stop
echo ========================================
echo.

npm run dev