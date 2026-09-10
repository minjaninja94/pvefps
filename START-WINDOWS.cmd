@echo off
cd /d "%~dp0"
node scripts/build.mjs
if errorlevel 1 goto failed
echo Open http://localhost:8080 in your browser.
node scripts/serve.mjs
:failed
pause
