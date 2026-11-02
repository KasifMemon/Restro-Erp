@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the current Node.js LTS release first.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing project libraries. This needs an internet connection the first time...
  call npm install
  if errorlevel 1 (
    echo Library installation failed. Check internet access and try again.
    pause
    exit /b 1
  )
)
call npm run dev -- --host 0.0.0.0
pause
