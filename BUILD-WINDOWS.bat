@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (echo Install Node.js LTS first.& pause & exit /b 1)
if not exist node_modules call npm install
if errorlevel 1 (echo Dependency installation failed.& pause & exit /b 1)
call npm run build
if errorlevel 1 (echo Build failed. Review the error above.& pause & exit /b 1)
echo Build completed. Production files are in the dist folder.
pause
