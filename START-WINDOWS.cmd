@echo off
cd /d "%~dp0"
node build.mjs
if errorlevel 1 goto failed
echo Open http://localhost:8080 in your browser.
node serve.mjs
:failed
pause
