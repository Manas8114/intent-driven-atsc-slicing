@echo off
title Intent-Driven ATSC 3.0 - Full Demo Stack
color 0A

echo.
echo ===================================================
echo   Intent-Driven ATSC 3.0 Network Slicing
echo   FULL DEMO STACK LAUNCHER
echo   ITU-T FG-AINN Build-a-thon 4.0
echo ===================================================
echo.

REM Store the project directory
set PROJECT_DIR=%~dp0

REM Check if dependencies are installed
if not exist "venv" (
    echo [!] Virtual environment not found. Run start_project.cmd first!
    pause
    exit /b 1
)

echo [1/4] Starting Backend + Frontend...
echo       This will open in a new window.
start "ATSC Backend + Frontend" cmd /k "cd /d "%PROJECT_DIR%" && call start_project.cmd"

echo.
echo [2/4] Waiting for backend to initialize (8 seconds)...
timeout /t 8 /nobreak > nul

echo.
echo [3/4] Starting BLE Advertiser (Expo)...
echo       Scan the QR code with Expo Go app
start "BLE Advertiser" cmd /k "cd /d "%PROJECT_DIR%mobile\ble-advertiser" && title BLE Advertiser - Expo && npx expo start --port 8081"

echo.
echo [4/4] Starting BLE Receiver (Expo)...
echo       Scan the QR code with Expo Go app
start "BLE Receiver" cmd /k "cd /d "%PROJECT_DIR%mobile\ble-receiver" && title BLE Receiver - Expo && npx expo start --port 8082"

echo.
echo ===================================================
echo   ALL SERVICES STARTING
echo ===================================================
echo.
echo   Four windows should have opened:
echo.
echo   [1] Backend + Frontend (http://localhost:8000)
echo   [2] BLE Advertiser - Scan QR with Expo Go
echo   [3] BLE Receiver   - Scan QR with Expo Go
echo.
echo   TIP: Open Expo Go on your phone and scan QR codes
echo        to run mobile apps on your device.
echo.
echo ===================================================
echo   QUICK DEMO CHECKLIST
echo ===================================================
echo.
echo   [ ] Backend running at http://localhost:8000
echo   [ ] Frontend running at http://localhost:5173
echo   [ ] Advertiser QR visible in terminal
echo   [ ] Receiver QR visible in terminal
echo   [ ] Mobile phones on same WiFi as laptop
echo.
echo   DEMO FLOW:
echo   1. Open Frontend (localhost:5173)
echo   2. Click "Quick Demo Mode" button
echo   3. Open Advertiser on Phone 1
echo   4. Open Receiver on Phone 2
echo   5. Show constellation diagram
echo   6. Increase distance to show corruption
echo.
echo ===================================================
echo   Press any key to open Frontend in browser...
echo ===================================================
pause > nul
start http://localhost:5173
