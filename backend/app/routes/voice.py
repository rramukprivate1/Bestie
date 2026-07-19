"""
routes/voice.py

Two small endpoints: send a recording, get text back; send text, get a
recording back. Deliberately separate from /chat - transcription feeds
into the existing chat flow as if it were typed, and speech synthesis is
requested per-message from the frontend rather than baked into /chat's
response, so a message can be read silently, replayed, or never spoken
at all without the backend needing to know which.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.voice_client import transcribe_audio, synthesize_speech

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
