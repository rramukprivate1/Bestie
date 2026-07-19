"""
voice_client.py

Speech-to-text and text-to-speech, both via Gemini's standard generateContent
endpoint (same pattern as llm_client.py) rather than the newer Live API or
Interactions API - this app doesn't need a persistent bidirectional audio
session, just "record a clip, get text back" and "take text, get a clip
back", so the simpler request/response pattern is the right fit, and it
keeps every Gemini call in this backend on one consistent, well-tested
pattern.
"""

import base64
import io
import wave

import httpx

from app.config import settings

TEXT_MODEL = "gemini-3.5-flash"  # also used for transcription - audio understanding is built in
TTS_MODEL = "gemini-3.1-flash-tts-preview"

TRANSCRIBE_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{TEXT_MODEL}:generateContent"
SPEAK_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{TTS_MODEL}:generateContent"

TRANSCRIBE_INSTRUCTION = (
    "Transcribe this audio exactly as spoken. Preserve the original language(s) "
    "used, including any mixed-language or informal/slang speech - do not "
    "translate or clean it up. Reply with only the transcription, nothing else. "
    "If nothing intelligible was said, reply with exactly: [inaudible]"
)

# Gemini's TTS returns raw 16-bit PCM audio at this rate - confirmed by the
# model's own documentation. Wrapping it in a WAV header (below) is what
# makes it directly playable in a browser <audio> element with no extra
# client-side handling.
PCM_SAMPLE_RATE = 24000
PCM_SAMPLE_WIDTH = 2  # bytes (16-bit)
PCM_CHANNELS = 1


def _pcm_to_wav_base64(pcm_bytes: bytes) -> str:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(PCM_CHANNELS)
        wav_file.setsampwidth(PCM_SAMPLE_WIDTH)
        wav_file.setframerate(PCM_SAMPLE_RATE)
        wav_file.writeframes(pcm_bytes)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


async def transcribe_audio(audio_base64: str, mime_type: str) -> str:
    if not settings.gemini_api_key:
        raise ValueError("MISSING_API_KEY: Set GEMINI_API_KEY in backend/.env, then restart the server.")

    body = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": TRANSCRIBE_INSTRUCTION},
                    {"inline_data": {"mime_type": mime_type, "data": audio_base64}},
                ],
            }
        ],
        "generationConfig": {"temperature": 0.0},
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(TRANSCRIBE_URL, json=body, headers={"x-goog-api-key": settings.gemini_api_key})

    if resp.status_code != 200:
        detail = _extract_error(resp)
        raise ValueError(f"TRANSCRIBE_ERROR: {detail}")

    data = resp.json()
    candidates = data.get("candidates", [])
    parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
    text = "".join(p.get("text", "") for p in parts).strip()

    if not text or text == "[inaudible]":
        raise ValueError("INAUDIBLE: Could not make out any speech in that recording - try again.")

    return text


async def synthesize_speech(text: str, voice_name: str = "Kore") -> tuple[str, str]:
    """Returns (base64_wav_audio, mime_type)."""
    if not settings.gemini_api_key:
        raise ValueError("MISSING_API_KEY: Set GEMINI_API_KEY in backend/.env, then restart the server.")

    body = {
        "contents": [{"role": "user", "parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice_name}}},
        },
    }

    # The TTS model occasionally returns text tokens instead of audio on a
    # given attempt (a known quirk, not specific to this app) - one retry
    # covers the vast majority of those cases without the user noticing.
    last_error = "unknown error"
    for attempt in range(2):
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(SPEAK_URL, json=body, headers={"x-goog-api-key": settings.gemini_api_key})

        if resp.status_code != 200:
            last_error = _extract_error(resp)
            continue

        data = resp.json()
        candidates = data.get("candidates", [])
        parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
        audio_parts = [p for p in parts if "inlineData" in p or "inline_data" in p]

        if audio_parts:
            inline = audio_parts[0].get("inlineData") or audio_parts[0].get("inline_data")
            pcm_bytes = base64.b64decode(inline["data"])
            wav_base64 = _pcm_to_wav_base64(pcm_bytes)
            return wav_base64, "audio/wav"

        last_error = "model returned text instead of audio"

    raise ValueError(f"SPEAK_ERROR: {last_error} (after retry)")


def _extract_error(resp: httpx.Response) -> str:
    try:
        return resp.json().get("error", {}).get("message", f"status {resp.status_code}")
    except Exception:
        return f"status {resp.status_code}"
