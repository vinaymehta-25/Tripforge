@echo off
setlocal
cd /d "%~dp0"
if not exist backend\.venv\Scripts\activate.bat (
  echo Run setup-windows.bat first.
  pause
  exit /b 1
)
call backend\.venv\Scripts\activate.bat
cd backend
alembic upgrade head
if errorlevel 1 goto :failed
python -m app.seed
if errorlevel 1 goto :failed
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
exit /b 0
:failed
echo Database setup failed. Confirm PostgreSQL is running and .env contains the correct connection string.
pause
exit /b 1
