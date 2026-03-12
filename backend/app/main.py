"""
CodeMind AI — FastAPI Application Entry Point
Bootstraps the FastAPI app, CORS middleware, and routers.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Load environment variables
load_dotenv()

from app.api.routes import router

app = FastAPI(
    title="CodeMind AI",
    description="AI-powered codebase explainer using RAG + Gemini",
    version="1.0.0",
)

# -----------------------------
# CORS
# -----------------------------
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://codemind-ai.vercel.app",
    "https://code-mind-ai-sable.vercel.app",
    "https://code-mind-au2472ykj-shubham06032003s-projects.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# API Routes
# -----------------------------
app.include_router(router, prefix="/api")

# -----------------------------
# Serve React Build
# -----------------------------
if os.path.exists("frontend/dist"):

    app.mount(
        "/assets",
        StaticFiles(directory="frontend/dist/assets"),
        name="assets"
    )

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        return FileResponse("frontend/dist/index.html")

else:

    @app.get("/")
    async def root():
        return {
            "message": "CodeMind AI backend is running 🚀",
            "docs": "/docs"
        }