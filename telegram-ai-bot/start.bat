@echo off
echo ==============================
echo   Telegram AI Bot
echo ==============================
echo.

if not exist .env (
    echo File .env belum ada!
    echo Copy .env.example ke .env lalu isi BOT_TOKEN
    echo.
    pause
    exit /b
)

for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    if "%%a"=="BOT_TOKEN" set BOT_TOKEN=%%b
)

if "%BOT_TOKEN%"=="" (
    echo BOT_TOKEN belum diisi di file .env
    pause
    exit /b
)

python bot.py
pause
