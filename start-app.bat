@echo off
echo ============================================
echo   HOSE PRO WMS - Startup Script
echo ============================================
echo.

echo [1/2] Starting Backend Server (Port 8000)...
cd /d "%~dp0backend-hose-ai"
start "Backend - HOSE PRO" cmd /k ".\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Server (Port 5173)...
cd /d "%~dp0"
start "Frontend - HOSE PRO" cmd /k "npm run dev"

timeout /t 5 /nobreak > nul

echo.
echo ============================================
echo   HOSE PRO WMS Started Successfully!
echo ============================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo Press any key to open the app in browser...
pause > nul

start http://localhost:5173
