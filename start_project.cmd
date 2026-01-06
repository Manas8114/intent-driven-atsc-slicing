@echo off
setlocal

echo ===================================================
echo Starting Intent-Driven ATSC Slicing Project
echo ===================================================

:: Start Backend
echo Starting Backend Server...
start "Backend Server" cmd /k "pip install -r backend\requirements.txt && python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

:: Start Frontend
echo Starting Frontend Client...
cd frontend
start "Frontend Client" cmd /k "npm install && npm run dev"
cd ..

echo ===================================================
echo backend running at: http://localhost:8000
echo frontend running at: http://localhost:5173
echo ===================================================
pause
