@echo off
setlocal
cd /d "%~dp0"
title Saudia One IT Enterprise v1.8
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-dist-windows.ps1"
if errorlevel 1 (
  echo.
  echo The application could not start. See تعليمات_ويندوز.txt.
  pause
)
endlocal
