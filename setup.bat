@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Agent Squad Setup (Windows)
echo ========================================
echo.

REM Detect environment
echo Detecting build environment...
set PYTHON_OK=0
set BUILD_OK=0

REM Check Python (direct call, more reliable)
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_OK=1
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do echo   [OK] Python %%i found
) else (
    echo   [--] Python not found
)

REM Check Visual Studio Build Tools (check cl.exe)
cl >nul 2>&1
if %errorlevel% equ 0 (
    set BUILD_OK=1
    echo   [OK] MSVC found
) else (
    REM Check for MinGW gcc
    gcc --version >nul 2>&1
    if !errorlevel! equ 0 (
        set BUILD_OK=1
        echo   [OK] MinGW GCC found
    ) else (
        echo   [--] No C compiler found
    )
)

echo.
if !PYTHON_OK! equ 1 (
    if !BUILD_OK! equ 1 (
        echo Environment ready for full installation
    ) else (
        echo Environment missing VS Build Tools
        echo.
        echo To enable native compilation:
        echo   1. Python is installed [OK]
        echo   2. Install VS Build Tools:
        echo      https://visualstudio.microsoft.com/visual-cpp-build-tools/
        echo      (Select: Desktop development with C++)
        echo.
    )
) else (
    echo Environment not configured for native modules
    echo.
    echo To enable native compilation:
    echo   1. Install Python: https://www.python.org/downloads/
    echo      (Check "Add Python to PATH" during install)
    echo   2. Install VS Build Tools:
    echo      https://visualstudio.microsoft.com/visual-cpp-build-tools/
    echo      (Select: Desktop development with C++)
    echo.
)

set /p CONTINUE="Continue with installation? (Y/n): "
if /i "!CONTINUE!" equ "n" (
    echo Setup cancelled. Please configure build tools first.
    pause
    exit /b 0
)

REM Install dependencies
echo.
echo Installing dependencies...

if !PYTHON_OK! equ 1 (
    if !BUILD_OK! equ 1 (
        echo Full installation with native modules...
        call npm install
    ) else (
        echo Installation without native compilation...
        call npm install --ignore-scripts
    )
) else (
    echo Fallback installation (skip native compilation)...
    call npm install --ignore-scripts
)

if !errorlevel! neq 0 (
    echo.
    echo [ERROR] Installation failed!
    echo Try manual install: npm install --ignore-scripts
    pause
    exit /b 1
)

REM Verify installation
echo.
echo Verifying installation...

if exist "node_modules\next" (
    echo   [OK] next installed
) else (
    echo   [X] next missing!
)

if exist "node_modules\react" (
    echo   [OK] react installed
) else (
    echo   [X] react missing!
)

if exist "node_modules\@anthropic-ai\sdk" (
    echo   [OK] @anthropic-ai/sdk installed
) else (
    echo   [X] @anthropic-ai/sdk missing!
)

if exist "node_modules\better-sqlite3" (
    if exist "node_modules\better-sqlite3\build\Release\better_sqlite3.node" (
        echo   [OK] better-sqlite3 compiled
    ) else (
        echo   [--] better-sqlite3 not compiled (database features limited)
    )
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Configure API Key:
echo      - Copy: copy .env.local.example .env.local
echo      - Edit .env.local with your API key
echo      - Or configure in Web UI Settings
echo   2. Run: start.bat or npm run dev
echo.
pause