@echo off
echo ============================================
echo  Railroad Clarification Portal - Local Start
echo ============================================

REM --- Start Flask backend ---
echo.
echo [1/2] Starting Flask backend on http://localhost:5000 ...
start "Flask Backend" cmd /k "cd /d %~dp0backend && set ANTHROPIC_API_KEY=%ANTHROPIC_API_KEY% && python app.py"

REM Wait a moment for Flask to start
timeout /t 3 /nobreak >nul

REM --- Start Vite frontend ---
echo [2/2] Starting Vite frontend on http://localhost:5173 ...
start "Vite Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Portal will open at: http://localhost:5173
echo.
echo Demo logins:
echo   admin@railroad.com  / admin123
echo   editor@railroad.com / editor123
echo   viewer@railroad.com / viewer123
echo.
pause
