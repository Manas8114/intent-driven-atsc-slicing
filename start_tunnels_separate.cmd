@echo off
title Start BLE Receiver Ngrok Tunnel
color 0E

echo.
echo ===================================================
echo   STARTING BLE RECEIVER NGROK TUNNEL
echo ===================================================
echo.

set NGROK_PATH=%~dp0ngrok.exe

if not exist "%NGROK_PATH%" (
    echo [ERROR] ngrok.exe not found at: %NGROK_PATH%
    pause
    exit /b 1
)

echo [INFO] Killing existing ngrok processes to prevent conflicts...
taskkill /f /im ngrok.exe >nul 2>&1

echo [1/1] Starting Frontend tunnel (port 5173)...
start "Ngrok Frontend" cmd /k ""%NGROK_PATH%" http 5173"

echo.
echo ===================================================
echo   NGROK WINDOW OPENED
echo ===================================================
echo.
echo The window shows the unique public URL for Frontend.
echo.
echo Inspector: http://127.0.0.1:4040
echo.
pause
