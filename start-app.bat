@echo off
title React Basic App
cd /d "%~dp0"

echo Starting React Basic App...
echo.
echo The app will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

npx serve -s build -l 3000
