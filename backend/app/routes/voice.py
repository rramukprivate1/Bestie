"""
routes/voice.py

Two small endpoints: send a recording, get text back; send text, get a
recording back. Deliberately separate from /chat - transcription feeds
into the existing chat flow as if it were typed, and speech synthesis is
requested per-message from the frontend rather than baked into /chat's
response, so a message can be read silently, replayed, or never spoken
at all without the backend needing to know which.
"""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.voice_client import transcribe_audio, synthesize_speech
from app.services.groq_client import transcribe_audio_groq
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class TranscribeRequest(BaseModel):
    audio_base64: str
    mime_type: str = "audio/webm"


class TranscribeResponse(BaseModel):
    text: str


class SpeakRequest(BaseModel):
    text: str
    voice_name: str = "Kore"


class SpeakResponse(BaseModel):
    audio_base64: str
    mime_type: str


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(req: TranscribeRequest):
    # Groq first if configured - it's free and doesn't touch Gemini's
    # tighter rate limit at all. Falls back to Gemini if no Groq key is
    # set, or if Groq itself has a problem - so this never regresses
    # behavior for anyone who hasn't set up a Groq key.
    if settings.groq_api_key:
        try:
            text = await transcribe_audio_groq(req.audio_base64, req.mime_type)
            return TranscribeResponse(text=text)
        except ValueError as e:
            if str(e) == "MISSING_GROQ_KEY":
                pass  # shouldn't happen given the guard above, but fall through safely
            elif str(e).startswith("INAUDIBLE"):
                raise HTTPException(status_code=502, detail=str(e))
            else:
                logger.warning("Groq transcription failed, falling back to Gemini: %s", e)

    try:
        text = await transcribe_audio(req.audio_base64, req.mime_type)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return TranscribeResponse(text=text)


@router.post("/speak", response_model=SpeakResponse)
async def speak(req: SpeakRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="EMPTY_TEXT: Nothing to speak.")
    try:
        audio_base64, mime_type = await synthesize_speech(req.text, req.voice_name)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return SpeakResponse(audio_base64=audio_base64, mime_type=mime_type)
