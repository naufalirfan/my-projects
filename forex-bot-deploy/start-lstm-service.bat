@echo off
echo ========================================
echo   LSTM Forex Prediction Service
echo ========================================
echo.

cd /d "%~dp0lstm-service"

echo Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo.
echo Installing dependencies...
pip install -r requirements.txt

if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Starting LSTM Service on port 5000...
echo Press Ctrl+C to stop
echo.
python -m flask --app app run --host=0.0.0.0 --port=5000
