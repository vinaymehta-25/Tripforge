@echo off
setlocal
cd /d "%~dp0"
if not exist .env copy .env.example .env >nul
if not exist backend\.venv\Scripts\python.exe (
  py -3 -m venv backend\.venv
  if errorlevel 1 goto :failed
)
call backend\.venv\Scripts\activate.bat
python -m pip install --upgrade pip
if errorlevel 1 goto :failed
python -m pip install -r backend\requirements-dev.txt
if errorlevel 1 goto :failed
cd frontend
npm install
if errorlevel 1 goto :failed
cd ..
echo.
echo Packages are installed. Update .env with your PostgreSQL password, then run start-backend.bat and start-frontend.bat.
pause
exit /b 0
:failed
echo Setup stopped. Check the message above, then run this script again.
pause
exit /b 1
