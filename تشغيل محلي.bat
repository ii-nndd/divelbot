@echo off
chcp 65001 >NUL
title Nova Bot - Local
cd /d "%~dp0"

echo ============================================
echo   Nova Bot - run on this PC
echo ============================================
echo.

where node >NUL 2>NUL
if errorlevel 1 (
  echo [X] Node.js was not found.
  echo     Install it from https://nodejs.org  then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [*] First run: installing packages. This can take a few minutes...
  call npm.cmd install
  if errorlevel 1 (
    echo [X] npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

if not exist ".env" (
  copy /Y ".env.example" ".env" >NUL
  echo [!] I created a file named ".env" for you.
  echo     Fill in DISCORD_TOKEN first ^(and the dashboard values if you want /dashboard^),
  echo     save the file, close Notepad, then run this file again.
  start notepad ".env"
  pause
  exit /b 0
)

echo [OK] Starting the bot now. Keep this window open.
echo      To stop the bot: press Ctrl+C or close this window.
echo.
node index.js
echo.
echo [!] The bot stopped. Read the messages above.
pause
