"""
CodeMind AI — FAISS Vectorstore
Manages creation, persistence, and similarity search of FAISS indexes.
Each task gets its own index stored under FAISS_INDEX_DIR/{task_id}/.
"""

import os
import json
import pickle
import numpy as np
from typing import List, Dict, Any, Tuple

FAISS_INDEX_DIR = os.getenv("FAISS_INDEX_DIR", "./faiss_indexes")


def _index_path(task_id: str) -> str:
    return os.path.join(FAISS_INDEX_DIR, task_id)


def create_index(task_id: str, embeddings: List[List[float]], metadata: List[Dict[str, Any]]) -> None:
    """
    Build a new FAISS flat L2 index from embeddings and save it with metadata.
    """
    try:
        import faiss
    except ImportError:
        raise RuntimeError("faiss-cpu is not installed. Run: pip install faiss-cpu")

    vectors = np.array(embeddings, dtype=np.float32)
    dim = vectors.shape[1]

    index = faiss.IndexFlatL2(dim)
    # Wrap with IDMap so we can store integer IDs
    index_with_ids = faiss.IndexIDMap(index)
    ids = np.arange(len(embeddings), dtype=np.int64)
    index_with_ids.add_with_ids(vectors, ids)

    # Persist index and metadata
    os.makedirs(_index_path(task_id), exist_ok=True)
    faiss.write_index(index_with_ids, os.path.join(_index_path(task_id), "faiss.index"))

    with open(os.path.join(_index_path(task_id), "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False)

    print(f"[vectorstore] Saved FAISS index ({len(embeddings)} vectors, dim={dim}) for task {task_id}")


def search(task_id: str, query_vector: List[float], top_k: int = 6) -> List[Dict[str, Any]]:
    """
    Perform similarity search and return top_k metadata entries with scores.
    Returns empty list if index not found.
    """
    try:
        import faiss
    except ImportError:
        return []

    index_file = os.path.join(_index_path(task_id), "faiss.index")
    meta_file = os.path.join(_index_path(task_id), "metadata.json")

    if not os.path.exists(index_file):
        return []

    index = faiss.read_index(index_file)
    with open(meta_file, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    query = np.array([query_vector], dtype=np.float32)
    distances, indices = index.search(query, min(top_k, len(metadata)))

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx < 0 or idx >= len(metadata):
            continue
        entry = dict(metadata[idx])
        entry["score"] = float(dist)
        results.append(entry)

    return results


def index_exists(task_id: str) -> bool:
    return os.path.exists(os.path.join(_index_path(task_id), "faiss.index"))
