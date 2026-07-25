"""
Tests for /transcribe and /speak. Both mock the actual Gemini call (same
pattern as test_chat.py) since neither the audio model nor the TTS model
can be exercised for real without a live API key.
"""

import base64
import wave
import io

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_transcribe_returns_text(monkeypatch):
    async def fake_transcribe_audio(audio_base64, mime_type):
        assert mime_type == "audio/webm"
        return "just feeling tired today"

    monkeypatch.setattr("app.routes.voice.transcribe_audio", fake_transcribe_audio)

    response = client.post("/transcribe", json={"audio_base64": "ZmFrZWF1ZGlv", "mime_type": "audio/webm"})

    assert response.status_code == 200
    assert response.json() == {"text": "just feeling tired today"}


def test_transcribe_surfaces_inaudible_clearly(monkeypatch):
    async def fake_transcribe_audio(audio_base64, mime_type):
        raise ValueError("INAUDIBLE: Could not make out any speech in that recording - try again.")

    monkeypatch.setattr("app.routes.voice.transcribe_audio", fake_transcribe_audio)

    response = client.post("/transcribe", json={"audio_base64": "ZmFrZWF1ZGlv"})

    assert response.status_code == 502
    assert "INAUDIBLE" in response.json()["detail"]


def test_speak_returns_playable_wav(monkeypatch):
    # Build a real, valid tiny WAV so this test also confirms the response
    # actually is well-formed audio, not just a plausible-looking string.
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(24000)
        f.writeframes(b"\x00\x00" * 100)
    fake_wav_b64 = base64.b64encode(buffer.getvalue()).decode("ascii")

    async def fake_synthesize_speech(text, voice_name="Kore"):
        assert text == "hey, how are you feeling?"
        return fake_wav_b64, "audio/wav"

    monkeypatch.setattr("app.routes.voice.synthesize_speech", fake_synthesize_speech)

    response = client.post("/speak", json={"text": "hey, how are you feeling?"})

    assert response.status_code == 200
    body = response.json()
    assert body["mime_type"] == "audio/wav"
    # Confirm what came back decodes as valid audio, not just any base64 string.
    decoded = base64.b64decode(body["audio_base64"])
    with wave.open(io.BytesIO(decoded), "rb") as f:
        assert f.getframerate() == 24000


def test_speak_rejects_empty_text():
    response = client.post("/speak", json={"text": "   "})
    assert response.status_code == 400
    assert "EMPTY_TEXT" in response.json()["detail"]


def test_transcribe_uses_groq_when_configured_and_never_touches_gemini(monkeypatch):
    monkeypatch.setattr("app.config.settings.groq_api_key", "fake-groq-key")

    async def fake_groq(audio_base64, mime_type):
        return "using groq now"

    async def gemini_should_not_be_called(audio_base64, mime_type):
        raise AssertionError("Gemini transcription was called even though Groq succeeded")

    monkeypatch.setattr("app.routes.voice.transcribe_audio_groq", fake_groq)
    monkeypatch.setattr("app.routes.voice.transcribe_audio", gemini_should_not_be_called)

    response = client.post("/transcribe", json={"audio_base64": "ZmFrZQ==", "mime_type": "audio/webm"})

    assert response.status_code == 200
    assert response.json() == {"text": "using groq now"}


def test_transcribe_falls_back_to_gemini_if_groq_fails(monkeypatch):
    monkeypatch.setattr("app.config.settings.groq_api_key", "fake-groq-key")

    async def failing_groq(audio_base64, mime_type):
        raise ValueError("GROQ_TRANSCRIBE_ERROR: service unavailable")

    async def fake_gemini(audio_base64, mime_type):
        return "gemini caught the fallback"

    monkeypatch.setattr("app.routes.voice.transcribe_audio_groq", failing_groq)
    monkeypatch.setattr("app.routes.voice.transcribe_audio", fake_gemini)

    response = client.post("/transcribe", json={"audio_base64": "ZmFrZQ=="})

    assert response.status_code == 200
    assert response.json() == {"text": "gemini caught the fallback"}


def test_transcribe_does_not_fall_back_on_genuine_inaudible(monkeypatch):
    """An INAUDIBLE result from Groq means nothing was actually said - that's
    a real answer, not a Groq failure, so retrying on Gemini would just waste
    a call for the same (correct) outcome."""
    monkeypatch.setattr("app.config.settings.groq_api_key", "fake-groq-key")

    async def inaudible_groq(audio_base64, mime_type):
        raise ValueError("INAUDIBLE: Could not make out any speech in that recording - try again.")

    async def gemini_should_not_be_called(audio_base64, mime_type):
        raise AssertionError("Should not fall back to Gemini for a genuine INAUDIBLE result")

    monkeypatch.setattr("app.routes.voice.transcribe_audio_groq", inaudible_groq)
    monkeypatch.setattr("app.routes.voice.transcribe_audio", gemini_should_not_be_called)

    response = client.post("/transcribe", json={"audio_base64": "ZmFrZQ=="})

    assert response.status_code == 502
    assert "INAUDIBLE" in response.json()["detail"]
