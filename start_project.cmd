@echo off
setlocal EnableDelayedExpansion

:: Get the script directory (where this .cmd file is located)
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo ===================================================
echo   Intent-Driven ATSC 3.0 Network Slicing
echo   ITU-T FG-AINN Build-a-thon 4.0
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

:: Check for and activate virtual environment
set "VENV_PYTHON=python"
if exist "%PROJECT_DIR%.venv\Scripts\activate.bat" (
    echo [OK] Virtual environment detected
    set "VENV_PYTHON=%PROJECT_DIR%.venv\Scripts\python.exe"
) else (
    echo [INFO] No .venv found, using system Python
)
echo.

:: Install Backend Dependencies
echo [1/6] Installing Backend Dependencies...
"%VENV_PYTHON%" -m pip install -r "%PROJECT_DIR%backend\requirements.txt" --quiet 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARN] Some backend dependencies may have failed. Continuing anyway...
)
echo [OK] Backend dependencies installed
echo.

:: Install Frontend Dependencies
echo [2/6] Installing Frontend Dependencies...
cd /d "%PROJECT_DIR%frontend"
call npm install --silent 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARN] Some frontend dependencies may have failed. Continuing anyway...
)
cd /d "%PROJECT_DIR%"
echo [OK] Frontend dependencies installed
echo.

:: Install Mobile App Dependencies (BLE Advertiser)
echo [3/6] Installing BLE Advertiser Mobile App Dependencies...
cd /d "%PROJECT_DIR%mobile\ble-advertiser"
call npm install --silent 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARN] Some ble-advertiser dependencies may have failed. Continuing anyway...
)
cd /d "%PROJECT_DIR%"
echo [OK] BLE Advertiser dependencies installed
echo.

:: Install Mobile App Dependencies (BLE Receiver)
echo [4/6] Installing BLE Receiver Mobile App Dependencies...
cd /d "%PROJECT_DIR%mobile\ble-receiver"
call npm install --silent 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARN] Some ble-receiver dependencies may have failed. Continuing anyway...
)
cd /d "%PROJECT_DIR%"
echo [OK] BLE Receiver dependencies installed
echo.

:: Start Backend Server (with venv if available)
echo [5/6] Starting Backend Server...
if exist "%PROJECT_DIR%.venv\Scripts\activate.bat" (
    start "ATSC Backend" cmd /k "cd /d "%PROJECT_DIR%" && call .venv\Scripts\activate && python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"
) else (
    start "ATSC Backend" cmd /k "cd /d "%PROJECT_DIR%" && python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"
)
timeout /t 3 /nobreak >nul

:: Start Frontend Dev Server
echo [6/6] Starting Frontend Dev Server...
start "ATSC Frontend" cmd /k "cd /d "%PROJECT_DIR%frontend" && npm run dev"

echo.
echo ===================================================
echo   OPTIONAL: Start Mobile Apps (Expo)
echo ===================================================
echo.
echo To start mobile apps, run these commands in separate terminals:
echo.
echo   BLE Advertiser:
echo     cd mobile\ble-advertiser
echo     npx expo start
echo.
echo   BLE Receiver:
echo     cd mobile\ble-receiver
echo     npx expo start
echo.

echo.
echo ===================================================
echo   Project Started Successfully!
echo ===================================================
echo.
echo   Backend API:    http://localhost:8000
echo   Frontend UI:    http://localhost:5173
echo   API Docs:       http://localhost:8000/docs
echo.
echo   Key Features:
echo   - AI-Native Network Slicing (PPO-based RL Agent)
echo   - Real-time Thinking Trace Visualization
echo   - Terrain-Aware RF Propagation (SRTM Data)
echo   - Chaos Director (Simulated Failure Scenarios)
echo   - ITU FG-AINN Architecture Compliance
echo.
echo ===================================================
echo   IMPORTANT: NETWORK CONFIGURATION CHECK
echo ===================================================
echo.
echo [1] Your Local IP Addresses (IPv4):
ipconfig | findstr /i "IPv4"
echo.
echo [2] Mobile Apps Configured Backend IP:
findstr "BACKEND_URL" "%PROJECT_DIR%mobile\ble-advertiser\App.tsx"
echo.
echo [!] ACTION REQUIRED IF RUNNING ON MOBILE:
echo     Ensure the IP address in [2] matches your WiFi IPv4 address in [1].
echo     If they differ, edit these files:
echo       - mobile\ble-advertiser\App.tsx
echo       - mobile\ble-receiver\App.tsx
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
