@echo off
echo Starting Spectra-AI Backend...
cd /d "%~dp0backend"
call ..\venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000
