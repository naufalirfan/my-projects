@echo off
cd /d "%~dp0"
echo Installing dependencies...
pip install -r requirements.txt
echo Starting AI Router...
python -m ai_router --config config.yaml
pause
