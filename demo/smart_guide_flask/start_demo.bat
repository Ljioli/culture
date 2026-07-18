@echo off
chcp 65001 >nul
echo ========================================
echo   Smart Guide Flask Service Launcher
echo ========================================
echo.
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo ERROR: Virtual env not found.
    pause
    exit /b 1
)
echo Starting Flask...
echo   http://127.0.0.1:5000
echo.
.venv\Scripts\python.exe app.py
pause
