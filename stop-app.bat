@echo off
echo Stopping HOSE PRO WMS servers...

:: Kill Node.js (Frontend)
taskkill /F /IM node.exe 2>nul
echo Frontend stopped.

:: Kill Python (Backend)
taskkill /F /IM python.exe 2>nul
echo Backend stopped.

echo.
echo All servers stopped.
pause
