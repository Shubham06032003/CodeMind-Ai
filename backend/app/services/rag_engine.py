"""
CodeMind AI — RAG Engine
Orchestrates the full pipeline:
  1. Clone GitHub repo with GitPython
  2. Walk & filter source files
  3. Chunk code with line-number metadata
  4. Generate embeddings (Gemini or stub)
  5. Store in FAISS
  6. Answer questions: embed query → retrieve chunks → prompt Gemini
"""

import os
import shutil
import asyncio
from pathlib import Path
from typing import List, Dict, Any

# In-memory task state store (replace with Redis in production)
# New — persists to disk so restarts don't lose tasks
import json

TASK_STORE_FILE = "./task_store.json"

def _load_task_store() -> Dict[str, Dict[str, Any]]:
    if os.path.exists(TASK_STORE_FILE):
        try:
            with open(TASK_STORE_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {}

def _save_task_store():
    with open(TASK_STORE_FILE, "w") as f:
        json.dump(task_store, f)

task_store: Dict[str, Dict[str, Any]] = _load_task_store()

TEMP_CLONE_DIR = os.getenv("TEMP_CLONE_DIR", "./tmp_repos")

# File extensions we care about
ALLOWED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".md", ".json", ".yml", ".yaml", ".go",
    ".java", ".rb", ".rs", ".cpp", ".c", ".h",
}

EXCLUDED_DIRS = {
    "node_modules", ".git", "venv", ".venv", "env",
    "dist", "build", "__pycache__", ".next", ".nuxt",
    "coverage", ".pytest_cache", "eggs", ".eggs",
}

# Directories to skip
EXCLUDED_EXTENSIONS = {
    ".pkl", ".joblib", ".h5", ".hdf5",
    ".csv", ".parquet", ".xlsx",
    ".ipynb",
    ".png", ".jpg", ".jpeg", ".gif",
    ".pdf", ".zip", ".tar", ".gz",
    ".bin", ".exe", ".dll", ".so",
}
CHUNK_LINES = 80
CHUNK_OVERLAP = 5

# ── File helpers ─────────────────────────────────────────────────────────────

def _collect_files(repo_path: str) -> List[Path]:
    """Walk repo directory, filter by extension and excluded dirs."""
    collected = []
    
    for root_dir, dirs, files in os.walk(repo_path):
        # In-place modify dirs to skip excluded ones entirely
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
        
        for file in files:
            path = Path(root_dir) / file
            if path.suffix.lower() in ALLOWED_EXTENSIONS and path.suffix.lower() not in EXCLUDED_EXTENSIONS:
                collected.append(path)

    return collected


def _chunk_file(file_path: Path, repo_root: str) -> List[Dict[str, Any]]:
    """
    Split a file into overlapping chunks of CHUNK_LINES lines.
    Returns list of dicts with: file, start_line, end_line, snippet, text (for embedding).
    """
    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
        # Skip files larger than 100KB
        if len(content) > 100_000:
            return []
    except Exception:
        return []

    lines = content.splitlines()
    if not lines:
        return []

    relative_path = str(file_path.relative_to(repo_root))
    chunks = []
    step = max(1, CHUNK_LINES - CHUNK_OVERLAP)

    for start in range(0, len(lines), step):
        end = min(start + CHUNK_LINES, len(lines))
        snippet_lines = lines[start:end]
        snippet = "\n".join(snippet_lines)
        if snippet.strip():
            chunks.append({
                "file": relative_path,
                "start_line": start + 1,
                "end_line": end,
                "snippet": snippet,
                # text combines path context + code for richer embedding
                "text": f"File: {relative_path} (lines {start+1}-{end})\n{snippet}",
            })
        if end >= len(lines):
            break

    return chunks


# ── Main pipeline ─────────────────────────────────────────────────────────────

def analyze_repo(task_id: str, repo_url: str) -> None:
    """
    Background task: clone → chunk → embed → index.
    Updates task_store throughout so the frontend can poll progress.
    """
    from app.core.embeddings import get_embeddings
    from app.core.vectorstore import create_index

    def _update(status: str, progress: int, message: str, **kwargs):
        task_store[task_id].update({
            "status": status,
            "progress": progress,
            "message": message,
            **kwargs,
        })
        _save_task_store()

    clone_dir = os.path.join(TEMP_CLONE_DIR, task_id)

    try:
        # ── Step 1: Clone ──────────────────────────────────────────────────
        _update("cloning", 5, "Cloning repository…")
        os.makedirs(clone_dir, exist_ok=True)

        try:
            import subprocess
            result = subprocess.run(
                [
                    "git", "clone",
                    "--depth=1",
                    "--single-branch",
                    "--filter=blob:none",
                    repo_url,
                    clone_dir
                ],
                timeout=180,
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                _update("error", 0, f"Clone failed: {result.stderr}")
                return
        except subprocess.TimeoutExpired:
            _update("error", 0, "Clone timed out after 180 seconds.")
            shutil.rmtree(clone_dir, ignore_errors=True)
            return
        except Exception as e:
            _update("error", 0, f"Clone failed: {e}")
            return

        # ── Step 2: Collect files ──────────────────────────────────────────
        _update("indexing", 20, "Scanning files…")
        files = _collect_files(clone_dir)
        if not files:
            _update("error", 0, "No supported source files found in repository.")
            return

        # Detect active stack from extensions
        extensions_found = {f.suffix.lower() for f in files}
        stack_tags = _derive_stack(extensions_found, clone_dir)

        limit_exceeded = False
        if len(files) > 150:
            files = files[:150]
            limit_exceeded = True

        _update("indexing", 30, f"Found {len(files)} files. Chunking…", file_count=len(files), limit_exceeded=limit_exceeded)

        # ── Step 3: Chunk ──────────────────────────────────────────────────
        all_chunks: List[Dict[str, Any]] = []
        for f in files:
            all_chunks.extend(_chunk_file(f, clone_dir))

        if not all_chunks:
            _update("error", 0, "No content chunks produced.")
            return

        _update("embedding", 50, f"Chunked into {len(all_chunks)} segments. Generating embeddings…",
                chunk_count=len(all_chunks))

        # ── Step 4: Embed ──────────────────────────────────────────────────
        texts = [c["text"] for c in all_chunks]
        all_embeddings = []
        batch_size = 50
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i: i + batch_size]
            all_embeddings.extend(get_embeddings(batch))
            progress = 50 + int(40 * min(i + batch_size, len(texts)) / len(texts))
            _update("embedding", min(progress, 88),
                    f"Embedded {min(i + batch_size, len(texts))}/{len(texts)} chunks…",
                    chunk_count=len(all_chunks))

        # ── Step 5: Index ──────────────────────────────────────────────────
        _update("saving", 90, "Building FAISS index…")

        metadata = [{k: v for k, v in c.items() if k != "text"} for c in all_chunks]
        create_index(task_id, all_embeddings, metadata)

        _update(
            "complete", 100,
            f"Repository indexed. {len(files)} files · {len(all_chunks)} chunks analysed.",
            file_count=len(files),
            chunk_count=len(all_chunks),
            stack_tags=stack_tags,
            limit_exceeded=limit_exceeded,
        )

    except Exception as exc:
        _update("error", 0, f"Unexpected error: {exc}")
        shutil.rmtree(clone_dir, ignore_errors=True)

# ── Question answering ────────────────────────────────────────────────────────

async def answer_question(task_id: str, question: str, top_k: int = 6) -> Dict[str, Any]:
    """
    Embed question → retrieve top-k chunks → build prompt → call Gemini → return answer + sources.
    """
    from app.core.embeddings import get_query_embedding
    from app.core.vectorstore import search
    from app.core.gemini_client import generate_text

    # Run blocking operations in thread pool
    loop = asyncio.get_event_loop()

    query_vector = await loop.run_in_executor(None, get_query_embedding, question)
    chunks = await loop.run_in_executor(None, search, task_id, query_vector, top_k)

    if not chunks:
        return {
            "answer": "No relevant code found for your question. The repository may still be indexing.",
            "sources": [],
        }

    # Build prompt
    repo_url = task_store.get(task_id, {}).get("repo_url", "the repository")
    prompt = _build_prompt(question, chunks, repo_url)

    system_message = (
        "You are CodeMind AI, an expert code analyst. "
        "Your job is to explain codebases clearly to developers. "
        "Always reference specific files and line numbers. "
        "Use markdown with fenced code blocks. "
        "Be concise but thorough."
    )

    answer = await loop.run_in_executor(None, generate_text, prompt, system_message, 1200)

    sources = [
        {
            "file": c["file"],
            "start_line": c["start_line"],
            "end_line": c["end_line"],
            "snippet": c["snippet"][:600],  # truncate for response size
        }
        for c in chunks
    ]

    return {"answer": answer, "sources": sources}


def _build_prompt(question: str, chunks: List[Dict[str, Any]], repo_url: str) -> str:
    """Construct a RAG prompt with retrieved snippets."""
    snippets_text = ""
    for i, chunk in enumerate(chunks, 1):
        snippets_text += (
            f"\n### Source {i}: `{chunk['file']}` (lines {chunk['start_line']}–{chunk['end_line']})\n"
            f"```\n{chunk['snippet'][:800]}\n```\n"
        )

    return f"""You are analysing the GitHub repository: {repo_url}

## Question
{question}

## Retrieved Code Snippets
The following are the most relevant sections of the codebase retrieved for this question:
{snippets_text}

## Your Task
Answer the question above clearly and thoroughly, using only the retrieved snippets as evidence.
- Cite file paths and line numbers when referencing code.
- Format your response in markdown with fenced code blocks where helpful.
- If the snippets are insufficient to fully answer, say so honestly.
"""


def _derive_stack(extensions: set, repo_dir: str) -> List[str]:
    """Heuristically derive tech stack tags from file extensions and config files."""
    tags = []
    mapping = {
        ".ts": "TypeScript", ".tsx": "TypeScript",
        ".js": "JavaScript", ".jsx": "JavaScript",
        ".py": "Python",
        ".go": "Go",
        ".java": "Java",
        ".rb": "Ruby",
        ".rs": "Rust",
        ".cpp": "C++", ".c": "C",
    }
    for ext, lang in mapping.items():
        if ext in extensions and lang not in tags:
            tags.append(lang)

    # Config-based detection
    config_checks = {
        "next.config.js": "Next.js", "next.config.ts": "Next.js",
        "vite.config.js": "Vite", "vite.config.ts": "Vite",
        "tailwind.config.js": "Tailwind", "tailwind.config.ts": "Tailwind",
        "prisma/schema.prisma": "Prisma",
        "docker-compose.yml": "Docker",
        "Dockerfile": "Docker",
    }
    for filename, tag in config_checks.items():
        if Path(os.path.join(repo_dir, filename)).exists() and tag not in tags:
            tags.append(tag)

    return tags[:8]  # cap at 8 tags
