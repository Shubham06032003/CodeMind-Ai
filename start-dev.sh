#!/usr/bin/env bash
# ============================================================
# CodeMind AI — Dev Startup Script (Linux / macOS)
# Starts both backend (FastAPI) and frontend (Vite) together.
# Safe to run multiple times (idempotent).
# ============================================================
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/.venv"

echo "🚀 CodeMind AI — Starting dev environment..."
echo "   Root: $ROOT_DIR"
echo ""

# ── 1. Create .env if not exists ──────────────────────────────────────────────
if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "📋 Creating .env from .env.example..."
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  echo "   ⚠️  Edit .env and set GEMINI_API_KEY before using AI features."
fi

# ── 2. Python virtual environment ─────────────────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
  echo "🐍 Creating Python virtual environment in backend/.venv..."
  python3 -m venv "$VENV_DIR"
fi

echo "📦 Installing / verifying backend dependencies..."
"$VENV_DIR/bin/pip" install --quiet --upgrade pip
"$VENV_DIR/bin/pip" install --quiet -r "$BACKEND_DIR/requirements.txt"

# ── 3. Create temp directories ────────────────────────────────────────────────
mkdir -p "$ROOT_DIR/tmp_repos" "$ROOT_DIR/faiss_indexes"

# ── 4. Frontend dependencies ──────────────────────────────────────────────────
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "📦 Installing frontend npm dependencies..."
  npm --prefix "$FRONTEND_DIR" install
fi

# ── 5. Launch backend in background ──────────────────────────────────────────
echo ""
echo "▶️  Starting FastAPI backend on http://localhost:8000"
cd "$BACKEND_DIR"
"$VENV_DIR/bin/python" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Give the backend a moment to start
sleep 2

# ── 6. Launch frontend ────────────────────────────────────────────────────────
echo "▶️  Starting Vite frontend on http://localhost:5173"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Both services are running!"
echo "   Frontend → http://localhost:5173"
echo "   Backend  → http://localhost:8000"
echo "   API Docs → http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both."

# Wait for either process to exit and clean up both
wait_and_cleanup() {
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "Services stopped."
}
trap wait_and_cleanup EXIT INT TERM

wait $BACKEND_PID $FRONTEND_PID
