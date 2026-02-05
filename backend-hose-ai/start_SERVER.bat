@echo off
echo Starting HOSE PRO Backend...
cd /d "%~dp0"
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo Virtual environment not found. Please check setup.
    pause
    exit /b
)
python main.py
if %ERRORLEVEL% NEQ 0 (
    echo Server crashed or failed to start.
)
pause
