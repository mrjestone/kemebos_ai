"""Settings, read from environment variables (.env.local in development)."""
import os
from pathlib import Path

from dotenv import load_dotenv

# Locally the secrets live in .env.local; on Vercel they are real env vars.
load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


class Settings:
    mongodb_uri = os.getenv("MONGODB_URI", "")
    mongodb_db = os.getenv("MONGODB_DB", "kemebos")

    gemini_api_key = os.getenv("GEMINI_API_KEY", "")
    # Tried in order; an overloaded model (503) is skipped and the next one is used.
    gemini_chat_models = [m.strip() for m in os.getenv(
        "GEMINI_CHAT_MODELS", "gemini-3.5-flash-lite,gemini-flash-lite-latest,gemini-3.1-flash-lite").split(",") if m.strip()]
    # Gemini 3 models "think" before answering, which adds seconds. "minimal" keeps replies fast.
    gemini_thinking = os.getenv("GEMINI_THINKING", "minimal")
    first_token_seconds = float(os.getenv("LLM_FIRST_TOKEN_SECONDS", "5"))  # slower than this = treat as failed
    llm_order = [p.strip() for p in os.getenv("LLM_ORDER", "gemini,groq").split(",") if p.strip()]
    gemini_embed_model = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")
    embed_dims = _int("GEMINI_EMBED_DIMS", 768)

    groq_api_key = os.getenv("GROQ_API_KEY", "")
    groq_chat_model = os.getenv("GROQ_CHAT_MODEL", "openai/gpt-oss-120b")

    jwt_secret = os.getenv("JWT_SECRET", "")
    token_days = _int("TOKEN_DAYS", 7)
    admin_email = os.getenv("ADMIN_EMAIL", "")
    admin_password = os.getenv("ADMIN_PASSWORD", "")

    # Vercel sets VERCEL=1; cookies are Secure (HTTPS only) there.
    production = bool(os.getenv("VERCEL"))

    # Retrieval tuning
    top_k = _int("RAG_TOP_K", 4)
    # Calibrated on the sample data with gemini-embedding-001 (768 dims): relevant matches
    # score 0.65-0.76, unrelated text up to ~0.61. Re-check if the knowledge base changes a lot.
    min_score = float(os.getenv("RAG_MIN_SCORE", "0.62"))
    rel_margin = float(os.getenv("RAG_REL_MARGIN", "0.04"))    # keep hits within this of the best hit
    denied_margin = float(os.getenv("RAG_DENIED_MARGIN", "0.05"))  # restricted must beat allowed by this
    max_upload_bytes = _int("MAX_UPLOAD_BYTES", 4 * 1024 * 1024)  # Vercel body limit is 4.5 MB


settings = Settings()
