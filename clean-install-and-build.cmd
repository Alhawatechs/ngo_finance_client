@echo off
cd /d "%~dp0"
echo Removing node_modules...
if exist node_modules rmdir /s /q node_modules 2>nul
if exist node_modules (
  echo WARNING: Could not remove node_modules. Close Cursor/IDE and try again.
  pause
  exit /b 1
)
echo Running npm install...
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)
echo Running npm run build...
call npm run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo Done.
pause
