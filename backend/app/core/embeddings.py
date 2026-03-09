"""
CodeMind AI — Embeddings Module
Uses the new google-genai package with gemini-embedding-001.
Falls back to deterministic stub vectors when API key is absent.
"""

import os
import hashlib
import struct
from typing import List

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 768


import random

def _fake_vector(text: str) -> List[float]:
    # Use text to seed random so it's deterministic but contains valid floats
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    seed = int.from_bytes(digest[:8], byteorder="little")
    rng = random.Random(seed)
    return [rng.uniform(-1.0, 1.0) for _ in range(EMBEDDING_DIM)]


def get_embeddings(texts: List[str]) -> List[List[float]]:
    if not GEMINI_API_KEY:
        print("[embeddings] No API key — using stub vectors.")
        return [_fake_vector(t) for t in texts]

    try:
        from google import genai

        client = genai.Client(api_key=GEMINI_API_KEY)
        vectors = []

        batch_size = 50
        for i in range(0, len(texts), batch_size):
            batch = texts[i: i + batch_size]
            result = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=batch,
            )
            # result.embeddings is a list of embeddings corresponding to the batch
            vectors.extend([emb.values for emb in result.embeddings])

        return vectors

    except Exception as exc:
        print(f"[embeddings] Gemini API error: {exc} — using stub vectors.")
        return [_fake_vector(t) for t in texts]


def get_query_embedding(text: str) -> List[float]:
    if not GEMINI_API_KEY:
        return _fake_vector(text)

    try:
        from google import genai

        client = genai.Client(api_key=GEMINI_API_KEY)
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
        )
        return result.embeddings[0].values

    except Exception as exc:
        print(f"[embeddings] Query embedding error: {exc} — using stub.")
        return _fake_vector(text)