@echo off
setlocal EnableDelayedExpansion

:: Get the script directory (where this .cmd file is located)
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo ===================================================
echo   Intent-Driven ATSC 3.0 Network Slicing
echo   Build-a-thon 4.0 Project Startup
echo ===================================================
echo.

:: Check for Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ and try again.
    pause
    exit /b 1
)

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ and try again.
    pause
    exit /b 1
)

echo [OK] Python found
echo [OK] Node.js found
echo.

:: Install Backend Dependencies
echo [1/4] Installing Backend Dependencies...
pip install -r "%PROJECT_DIR%backend\requirements.txt" --quiet
if %ERRORLEVEL% neq 0 (
    echo [WARN] Some backend dependencies may have failed. Continuing anyway...
)
echo [OK] Backend dependencies installed
echo.

:: Install Frontend Dependencies
echo [2/4] Installing Frontend Dependencies...
cd /d "%PROJECT_DIR%frontend"
call npm install --silent 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARN] Some frontend dependencies may have failed. Continuing anyway...
)
cd /d "%PROJECT_DIR%"
echo [OK] Frontend dependencies installed
echo.

:: Start Backend Server
echo [3/4] Starting Backend Server...
start "ATSC Backend" cmd /k "cd /d "%PROJECT_DIR%" && python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

:: Start Frontend Dev Server
echo [4/4] Starting Frontend Dev Server...
start "ATSC Frontend" cmd /k "cd /d "%PROJECT_DIR%frontend" && npm run dev"

echo.
echo ===================================================
echo   Project Started Successfully!
echo ===================================================
echo.
echo   Backend API:    http://localhost:8000
echo   Frontend UI:    http://localhost:5173
echo   API Docs:       http://localhost:8000/docs
echo.
echo   New Features in this version:
echo   - Bootstrap Uncertainty Analysis (BCa intervals)
echo   - Traffic Offloading (Congestion Gauge)
echo   - Connected Vehicles / Mobility
echo   - Stage 1 and Stage 2 Proposals (docs folder)
echo.
echo ===================================================
echo   Press any key to open the frontend in browser...
echo ===================================================
pause >nul

:: Open the frontend in the default browser
start http://localhost:5173

echo.
echo To stop the servers, close the "ATSC Backend" and "ATSC Frontend" windows.
pause
