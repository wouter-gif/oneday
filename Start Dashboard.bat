@echo off
cd /d "%~dp0"

python --version >nul 2>&1
if %errorlevel% == 0 (
    start chrome "http://localhost:8000/dashboard.html"
    python server.py
    goto end
)

py --version >nul 2>&1
if %errorlevel% == 0 (
    start chrome "http://localhost:8000/dashboard.html"
    py server.py
    goto end
)

echo Python was not found on your system.
echo Please install Python from https://www.python.org/downloads/
echo Make sure to check "Add Python to PATH" during installation.
pause
:end
