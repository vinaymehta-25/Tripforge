@echo off
setlocal
cd /d "%~dp0frontend"
if not exist node_modules (
  echo Run setup-windows.bat first.
  pause
  exit /b 1
)
npm run dev
