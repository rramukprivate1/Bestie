"""
config.py

Central place for anything read from the environment. If you ever need a
new setting (a different port, a new API key, etc.), it goes here — no
other file should call os.getenv() directly.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    # Optional - if set, voice transcription uses Groq's free, fast Whisper
    # API instead of Gemini, freeing up Gemini's tighter rate limit for
    # replies and speech synthesis. Falls back to Gemini automatically if
    # this isn't set - see routes/voice.py.
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]
    # Defaults to a local SQLite file if unset OR left blank in .env -
    # `or` (not getenv's own default arg) handles the blank case, since a
    # key that's present but empty still counts as "set" to getenv, which
    # would otherwise silently skip the SQLite fallback. Set both once
    # you have a Neon connection string, see Phase 4 section of README.md.
    database_url: str = os.getenv("DATABASE_URL") or "sqlite:///./companion.db"
    database_url_unpooled: str = os.getenv("DATABASE_URL_UNPOOLED") or ""


settings = Settings()
