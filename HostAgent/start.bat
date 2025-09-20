@echo off
setlocal
pushd %~dp0
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run the Host Agent.
  echo Please install Node.js from https://nodejs.org and re-run start.bat
  pause
  exit /b 1
)
node server.js
popd
endlocal
