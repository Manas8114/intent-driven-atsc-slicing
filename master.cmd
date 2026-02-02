@echo off
title MASTER LAUNCHER - Intent-Driven ATSC 3.0
color 0F

echo ===================================================
echo   MASTER LAUNCHER
echo   Intent-Driven ATSC 3.0 Network Slicing
echo ===================================================
echo.

set "PROJECT_DIR=%~dp0"

:: 1. Start Ngrok Tunnel
echo [1/4] Starting Ngrok Tunnel...
echo       (This will open in a new window and update mobile configs)
start "Ngrok Tunnel" cmd /c "cd /d "%PROJECT_DIR%" && call start_ngrok.cmd"

echo.
echo       Waiting 10 seconds for Ngrok to initialize and update configs...
timeout /t 10 /nobreak > nul

:: 2. Start Backend & Frontend
echoParams
echo [2/4] Starting Backend & Frontend...
echo       (This will open separate windows for Backend and Frontend)
start "Project Setup" cmd /c "cd /d "%PROJECT_DIR%" && call start_project.cmd"

echo.
echo       Waiting 5 seconds for systems to spin up...
timeout /t 5 /nobreak > nul

:: 3. Start BLE Advertiser
echo.
echo [3/4] Starting BLE Advertiser (Expo)...
echo       [IMPORTANT] Scan the QR code in the NEW WINDOW titled "BLE Advertiser"
start "BLE Advertiser" cmd /k "cd /d "%PROJECT_DIR%mobile\ble-advertiser" && echo. && echo === SCAN THIS QR CODE FOR ADVERTISER === && echo. && npx expo start --clear --tunnel"

:: 4. Start BLE Receiver
echo.
echo [4/4] Starting BLE Receiver (Expo)...
echo       [IMPORTANT] Scan the QR code in the NEW WINDOW titled "BLE Receiver"
start "BLE Receiver" cmd /k "cd /d "%PROJECT_DIR%mobile\ble-receiver" && echo. && echo === SCAN THIS QR CODE FOR RECEIVER === && echo. && npx expo start --clear --tunnel"

echo.
echo ===================================================
echo   ALL SYSTEMS LAUNCHED
echo ===================================================
echo.
echo   Summary of Open Windows:
echo   1. Ngrok Tunnel (Minimizable)
echo   2. ATSC Backend (Keep Open)
echo   3. ATSC Frontend (Keep Open)
echo   4. BLE Advertiser (SCAN QR CODE HERE)
echo   5. BLE Receiver (SCAN QR CODE HERE)
echo.
echo   Frontend available at: http://localhost:5173
echo   Ngrok Inspector: http://127.0.0.1:4040/inspect/http
echo.
pause
