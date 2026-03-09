"""
CodeMind AI — API Routes
Defines the three primary endpoints: /analyze, /status/{task_id}, /chat
"""

import asyncio
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.services.rag_engine import analyze_repo, answer_question, task_store

router = APIRouter()


# ── Request / Response models ────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    repo_url: str


class ChatRequest(BaseModel):
    task_id: str
    question: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/analyze", status_code=202)
async def analyze(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Accept a GitHub repo URL, kick off async indexing, return task_id immediately.
    """
    import uuid
    task_id = str(uuid.uuid4())

    # Register task as queued before starting background work
    task_store[task_id] = {
        "status": "queued",
        "progress": 0,
        "message": "Queued for processing",
        "repo_url": request.repo_url,
        "file_count": 0,
        "chunk_count": 0,
    }

    background_tasks.add_task(analyze_repo, task_id, request.repo_url)

    return {"task_id": task_id, "status": "queued"}


@router.get("/status/{task_id}")
async def status(task_id: str):
    """
    Return current indexing progress for a given task_id.
    """
    if task_id not in task_store:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_store[task_id]


@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Given a task_id (indexed repo) and a question, retrieve relevant chunks
    and return a Gemini-powered answer with source references.
    """
    if request.task_id not in task_store:
        raise HTTPException(status_code=404, detail="Task not found. Run /analyze first.")

    task = task_store[request.task_id]
    if task["status"] not in ("complete", "ready"):
        raise HTTPException(
            status_code=400,
            detail=f"Repository not ready yet. Status: {task['status']}"
        )

    result = await answer_question(request.task_id, request.question)
    return result
