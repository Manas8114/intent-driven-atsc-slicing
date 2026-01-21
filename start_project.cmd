@echo off
echo Starting AI-Native Broadcast Platform...

:: Start Backend
start "Backend (FastAPI)" cmd /k "python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

:: Start Frontend
start "Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo Services started!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:8000/docs
