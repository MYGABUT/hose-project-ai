@echo off
echo ============================================
echo   HOSE PRO WMS - Restarting Server
echo ============================================
echo.

echo [1/3] Menutup Server Lama...
taskkill /FI "WINDOWTITLE eq Backend - HOSE PRO*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend - HOSE PRO*" /T /F >nul 2>&1

:: Menunggu sejenak memastikan port terbuka
timeout /t 2 /nobreak > nul

echo [2/3] Menerapkan Perbaikan Password Admin...
echo Memulai kembali backend dan web...

cd /d "%~dp0"
call start-app.bat
