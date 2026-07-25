"""
groq_client.py

Speech-to-text via Groq's free, fast Whisper API - a straight swap for
Gemini's audio-understanding transcription, used only for this one step.
Nothing else changes: the text this returns goes into exactly the same
/chat pipeline as anything typed, with the same memory indexing and
emotion tagging - transcription source is invisible past this point.

Kept as a direct REST call (httpx), matching the pattern the rest of
this backend already uses for Gemini, rather than adding the separate
`groq` SDK as a dependency for one endpoint.
"""

import base64

import httpx

from app.config import settings

TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
MODEL = "whisper-large-v3-turbo"


async def transcribe_audio_groq(audio_base64: str, mime_type: str) -> str:
    if not settings.groq_api_key:
        raise ValueError("MISSING_GROQ_KEY")  # caller falls back to Gemini - see routes/voice.py

    audio_bytes = base64.b64decode(audio_base64)
    extension = mime_type.split("/")[-1].split(";")[0] or "webm"  # "audio/webm;codecs=opus" -> "webm"

    files = {"file": (f"recording.{extension}", audio_bytes, mime_type)}
    data = {"model": MODEL, "response_format": "json"}
    headers = {"Authorization": f"Bearer {settings.groq_api_key}"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(TRANSCRIBE_URL, headers=headers, files=files, data=data)
    except httpx.RequestError:
        raise ValueError("NETWORK_ERROR: Could not reach Groq from the server.")

    if resp.status_code != 200:
        try:
            detail = resp.json().get("error", {}).get("message", f"status {resp.status_code}")
        except Exception:
            detail = f"status {resp.status_code}"
        raise ValueError(f"GROQ_TRANSCRIBE_ERROR: {detail}")

    text = resp.json().get("text", "").strip()
    if not text:
        raise ValueError("INAUDIBLE: Could not make out any speech in that recording - try again.")

    return text
