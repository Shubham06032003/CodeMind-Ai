"""
CodeMind AI — Chroma Vectorstore
Manages creation, persistence, and similarity search using ChromaDB.
Each task gets its own Chroma collection stored under CHROMA_DIR.
"""

import os
from typing import List, Dict, Any

CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_db")


def _get_client():
    import chromadb
    return chromadb.PersistentClient(path=CHROMA_DIR)


def _collection_name(task_id: str) -> str:
    return f"repo_{task_id.replace('-', '_')}"


def create_index(task_id: str, embeddings: List[List[float]], metadata: List[Dict[str, Any]]) -> None:
    """
    Store embeddings and metadata in a Chroma collection.
    Each task gets its own collection named repo_{task_id}.
    """
    client = _get_client()

    # Delete existing collection if re-indexing same task
    try:
        client.delete_collection(name=_collection_name(task_id))
    except Exception:
        pass

    collection = client.get_or_create_collection(
        name=_collection_name(task_id),
        metadata={"hnsw:space": "cosine"}
    )

    ids = [str(i) for i in range(len(embeddings))]
    documents = [m.get("snippet", "")[:500] for m in metadata]
    metadatas = [
        {
            "file": m.get("file", ""),
            "start_line": int(m.get("start_line", 0)),
            "end_line": int(m.get("end_line", 0)),
            "snippet": m.get("snippet", "")[:500],
        }
        for m in metadata
    ]

    # Add in batches of 100 to avoid memory spikes
    batch_size = 100
    for i in range(0, len(ids), batch_size):
        collection.add(
            ids=ids[i:i + batch_size],
            embeddings=embeddings[i:i + batch_size],
            documents=documents[i:i + batch_size],
            metadatas=metadatas[i:i + batch_size],
        )

    print(f"[vectorstore] Saved {len(embeddings)} vectors to Chroma for task {task_id}")


def search(task_id: str, query_vector: List[float], top_k: int = 6) -> List[Dict[str, Any]]:
    """
    Perform similarity search and return top_k metadata entries with scores.
    Returns empty list if collection not found.
    """
    client = _get_client()

    try:
        collection = client.get_collection(name=_collection_name(task_id))
    except Exception:
        return []

    count = collection.count()
    if count == 0:
        return []

    results = collection.query(
        query_embeddings=[query_vector],
        n_results=min(top_k, count),
        include=["documents", "metadatas", "distances"]
    )

    output = []
    for i in range(len(results["ids"][0])):
        meta = results["metadatas"][0][i]
        output.append({
            "file": meta.get("file", ""),
            "start_line": meta.get("start_line", 0),
            "end_line": meta.get("end_line", 0),
            "snippet": meta.get("snippet") or results["documents"][0][i],
            "score": results["distances"][0][i],
        })

    return output


def index_exists(task_id: str) -> bool:
    """Check if a Chroma collection exists and has vectors for this task."""
    try:
        client = _get_client()
        collection = client.get_collection(name=_collection_name(task_id))
        return collection.count() > 0
    except Exception:
        return False