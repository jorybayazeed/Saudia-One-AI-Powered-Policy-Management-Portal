@echo off
setlocal
cd /d "%~dp0"
title Saudia One IT Enterprise v1.8 - Development
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or 22 LTS is required for development mode.
  echo https://nodejs.org/
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (echo npm was not found.& pause& exit /b 1)
if not exist node_modules (
  echo Installing development dependencies...
  call npm install --registry=https://registry.npmjs.org/ --no-audit --no-fund
  if errorlevel 1 goto error
)
call npm run dev
exit /b 0
:error
echo Development mode failed to start.
pause
exit /b 1
