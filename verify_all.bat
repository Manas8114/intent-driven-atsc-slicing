@echo off
echo ==========================================
echo      CODEBASE HEALTH VERIFICATION
echo ==========================================

echo[
echo 1. Running Backend Tests...
set PYTHONPATH=backend
pytest
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Backend tests failed!
    exit /b 1
) else (
    echo [PASS] Backend tests passed.
)

echo[
echo 2. Running Frontend Lint...
cd frontend
call npm run lint
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Frontend lint has errors. Please fix.
) else (
    echo [PASS] Frontend lint passed.
)
cd ..

echo[
echo ==========================================
echo      VERIFICATION COMPLETE
echo ==========================================
