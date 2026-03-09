@echo off
REM ============================================================
REM CodeMind AI — Dev Startup Script (Windows)
REM Starts both backend (FastAPI) and frontend (Vite).
REM ============================================================

SET ROOT_DIR=%~dp0
SET BACKEND_DIR=%ROOT_DIR%backend
SET FRONTEND_DIR=%ROOT_DIR%frontend
SET VENV_DIR=%BACKEND_DIR%\.venv

echo 🚀 CodeMind AI — Starting dev environment...
echo    Root: %ROOT_DIR%
echo.

REM ── 1. Create .env if not exists ─────────────────────────────────────────
IF NOT EXIST "%ROOT_DIR%.env" (
  echo 📋 Creating .env from .env.example...
  copy "%ROOT_DIR%.env.example" "%ROOT_DIR%.env"
  echo    ^⚠️  Edit .env and set GEMINI_API_KEY
)

REM ── 2. Python virtual environment ────────────────────────────────────────
IF NOT EXIST "%VENV_DIR%" (
  echo 🐍 Creating Python virtual environment...
  python -m venv "%VENV_DIR%"
)

echo 📦 Installing backend dependencies...
"%VENV_DIR%\Scripts\pip.exe" install --quiet --upgrade pip
"%VENV_DIR%\Scripts\pip.exe" install --quiet -r "%BACKEND_DIR%\requirements.txt"

REM ── 3. Create temp directories ───────────────────────────────────────────
IF NOT EXIST "%ROOT_DIR%tmp_repos" mkdir "%ROOT_DIR%tmp_repos"
IF NOT EXIST "%ROOT_DIR%faiss_indexes" mkdir "%ROOT_DIR%faiss_indexes"

REM ── 4. Frontend dependencies ─────────────────────────────────────────────
IF NOT EXIST "%FRONTEND_DIR%\node_modules" (
  echo 📦 Installing frontend npm dependencies...
  npm --prefix "%FRONTEND_DIR%" install
)

REM ── 5. Start backend in new window ───────────────────────────────────────
echo.
echo ▶️  Starting FastAPI backend on http://localhost:8000
start "CodeMind Backend" cmd /k "cd /d "%BACKEND_DIR%" && "%VENV_DIR%\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM Give backend a moment
timeout /t 3 /nobreak >nul

REM ── 6. Start frontend in new window ──────────────────────────────────────
echo ▶️  Starting Vite frontend on http://localhost:5173
start "CodeMind Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo ✅ Both services started in separate windows!
echo    Frontend → http://localhost:5173
echo    Backend  → http://localhost:8000
echo    API Docs → http://localhost:8000/docs
echo.
echo Close the terminal windows to stop the services.
pause
