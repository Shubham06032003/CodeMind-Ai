"""
CodeMind AI — Backend Smoke Tests
Basic sanity checks: app loads, routes exist, stubs return expected shapes.
Run with: cd backend && python -m pytest tests/test_smoke.py -v
"""

import sys
import os

# Ensure backend package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Backend root should return 200."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


def test_analyze_returns_task_id():
    """POST /api/analyze should return 202 with a task_id."""
    response = client.post(
        "/api/analyze",
        json={"repo_url": "https://github.com/example/repo"},
    )
    assert response.status_code == 202
    data = response.json()
    assert "task_id" in data
    assert data["status"] == "queued"


def test_status_for_unknown_task():
    """GET /api/status/{unknown} should return 404."""
    response = client.get("/api/status/nonexistent-task-id-xyz")
    assert response.status_code == 404


def test_status_after_analyze():
    """After calling /analyze, /status should return the task."""
    resp = client.post("/api/analyze", json={"repo_url": "https://github.com/test/repo"})
    task_id = resp.json()["task_id"]
    status_resp = client.get(f"/api/status/{task_id}")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert "status" in data
    assert "progress" in data


def test_fake_embeddings_shape():
    """Stub embeddings should return the correct dimension."""
    from app.core.embeddings import _fake_vector, EMBEDDING_DIM
    vec = _fake_vector("hello world")
    assert len(vec) == EMBEDDING_DIM
    assert all(isinstance(v, float) for v in vec)


def test_gemini_client_fallback():
    """Without API key, gemini client should return a placeholder string."""
    os.environ.pop("GEMINI_API_KEY", None)
    from app.core import gemini_client
    gemini_client.GEMINI_API_KEY = ""
    result = gemini_client.generate_text("explain this code")
    assert isinstance(result, str)
    assert len(result) > 10
