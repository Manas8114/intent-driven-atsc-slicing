@echo off
title KILL ALL - Reset Project State
color 4F

echo.
echo ===================================================
echo   HARD RESET: KILLING ALL PROCESSES
echo ===================================================
echo.

echo [1/3] Killing Node.js processes (Frontend, Mobile)...
taskkill /F /IM node.exe /T 2>nul
if %ERRORLEVEL% equ 0 ( echo    - Killed Node.js ) else ( echo    - No Node.js processes found )

echo.
echo [2/3] Killing Python processes (Backend)...
taskkill /F /IM python.exe /T 2>nul
if %ERRORLEVEL% equ 0 ( echo    - Killed Python ) else ( echo    - No Python processes found )

echo.
echo [3/3] Killing Ngrok processes (Tunnels)...
taskkill /F /IM ngrok.exe /T 2>nul
if %ERRORLEVEL% equ 0 ( echo    - Killed Ngrok ) else ( echo    - No Ngrok processes found )

echo.
echo ===================================================
echo   CLEANUP COMPLETE
echo ===================================================
echo.
echo You can now restart cleanly using:
echo   .\start_project.cmd
echo   .\start_multi_tunnel.cmd
echo.
pause
