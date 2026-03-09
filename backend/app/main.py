"""
CodeMind AI — FastAPI Application Entry Point
Bootstraps the FastAPI app, CORS middleware, and routers.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.api.routes import router

app = FastAPI(
    title="CodeMind AI",
    description="AI-powered codebase explainer using RAG + Gemini",
    version="1.0.0",
)

# CORS — allow the Vite dev server and production build
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "CodeMind AI backend is running 🚀", "docs": "/docs"}
