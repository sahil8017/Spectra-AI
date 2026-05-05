@echo off
echo ==========================================
echo    Spectra AI - Launching All Services
echo ==========================================

:: Start Backend in a new window
echo Starting Backend...
start cmd /k "cd /d %~dp0backend && ..\venv\Scripts\activate && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

:: Start Frontend in a new window
echo Starting Frontend...
start cmd /k "npm run dev"

echo ==========================================
echo Spectra AI is now launching!
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo ==========================================
pause
