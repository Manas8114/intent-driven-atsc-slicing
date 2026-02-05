@echo off
title Start Individual Ngrok Tunnels
color 0E

echo.
echo ===================================================
echo   STARTING 4 SEPARATE NGROK TUNNELS
echo   Each will get a UNIQUE random URL
echo ===================================================
echo.

set NGROK_PATH=%~dp0ngrok.exe

echo [1/4] Starting Backend tunnel (port 8000)...
start "Ngrok - Backend 8000" cmd /k ""%NGROK_PATH%" http 8000 --region us"

timeout /t 3 /nobreak > nul

echo [2/4] Starting Frontend tunnel (port 5173)...
start "Ngrok - Frontend 5173" cmd /k ""%NGROK_PATH%" http 5173 --region us"

timeout /t 3 /nobreak > nul

echo [3/4] Starting BLE Advertiser tunnel (port 8081)...
start "Ngrok - Advertiser 8081" cmd /k ""%NGROK_PATH%" http 8081 --region us"

timeout /t 3 /nobreak > nul

echo [4/4] Starting BLE Receiver tunnel (port 8082)...
start "Ngrok - Receiver 8082" cmd /k ""%NGROK_PATH%" http 8082 --region us"

echo.
echo ===================================================
echo   4 NGROK WINDOWS OPENED
echo ===================================================
echo.
echo Each window shows its OWN unique URL like:
echo   https://xxxx-xxx-xxx-xxx.ngrok-free.app
echo.
echo Copy the URLs from each window for your demo!
echo.
echo Inspector: http://127.0.0.1:4040
echo.
pause
