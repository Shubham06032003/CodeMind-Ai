"""
CodeMind AI — Gemini LLM Client
Uses the new google-genai package with gemini-2.5-flash.
"""

import os
from typing import Optional

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.5-flash"


def generate_text(
    prompt: str,
    system_message: Optional[str] = None,
    max_tokens: int = 1200,
) -> str:
    if not GEMINI_API_KEY:
        return (
            "⚠️ **Gemini API key not configured.**\n\n"
            "Copy `.env.example` to `.env` and set your `GEMINI_API_KEY`.\n\n"
            "The retrieved code snippets show the most relevant sections found. "
            "Add your API key to get AI-powered explanations."
        )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_message or (
                    "You are CodeMind AI, an expert code analyst. "
                    "Explain codebases clearly and concisely. "
                    "Always cite file paths and line numbers. "
                    "Use markdown formatting with fenced code blocks."
                ),
                max_output_tokens=max_tokens,
                temperature=0.2,
            ),
        )

        return response.text

    except Exception as exc:
        return (
            f"⚠️ Gemini API error: `{exc}`\n\n"
            "Please verify your `GEMINI_API_KEY` is valid. "
            "The retrieved snippets are available for manual review."
        )