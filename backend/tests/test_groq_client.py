"""
Tests for groq_client.py - the actual HTTP call is mocked (no live Groq
key available here), but this confirms the request is built correctly
(multipart file upload, right endpoint, right auth header) and that
responses are parsed and error cases handled correctly.
"""

import base64
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.services.groq_client import transcribe_audio_groq


def _make_response(status_code, json_body):
    request = httpx.Request("POST", "https://api.groq.com/openai/v1/audio/transcriptions")
    return httpx.Response(status_code=status_code, json=json_body, request=request)


@pytest.mark.asyncio
async def test_raises_missing_key_when_not_configured(monkeypatch):
    monkeypatch.setattr("app.config.settings.groq_api_key", "")
    with pytest.raises(ValueError, match="MISSING_GROQ_KEY"):
        await transcribe_audio_groq(base64.b64encode(b"fake").decode(), "audio/webm")


@pytest.mark.asyncio
async def test_returns_transcribed_text(monkeypatch):
    monkeypatch.setattr("app.config.settings.groq_api_key", "fake-key")
    mock_post = AsyncMock(return_value=_make_response(200, {"text": "hey, feeling okay today"}))

    with patch("httpx.AsyncClient.post", mock_post):
        result = await transcribe_audio_groq(base64.b64encode(b"fake audio bytes").decode(), "audio/webm")

    assert result == "hey, feeling okay today"

    # Confirm the request was actually built as a multipart file upload
    # with the right auth header, not just that some call happened.
    _, kwargs = mock_post.call_args
    assert kwargs["headers"]["Authorization"] == "Bearer fake-key"
    assert "file" in kwargs["files"]
    assert kwargs["data"]["model"] == "whisper-large-v3-turbo"


@pytest.mark.asyncio
async def test_raises_inaudible_on_empty_transcript(monkeypatch):
    monkeypatch.setattr("app.config.settings.groq_api_key", "fake-key")
    mock_post = AsyncMock(return_value=_make_response(200, {"text": "   "}))

    with patch("httpx.AsyncClient.post", mock_post):
        with pytest.raises(ValueError, match="INAUDIBLE"):
            await transcribe_audio_groq(base64.b64encode(b"fake").decode(), "audio/webm")


@pytest.mark.asyncio
async def test_raises_clear_error_on_api_failure(monkeypatch):
    monkeypatch.setattr("app.config.settings.groq_api_key", "fake-key")
    mock_post = AsyncMock(return_value=_make_response(401, {"error": {"message": "invalid api key"}}))

    with patch("httpx.AsyncClient.post", mock_post):
        with pytest.raises(ValueError, match="GROQ_TRANSCRIBE_ERROR"):
            await transcribe_audio_groq(base64.b64encode(b"fake").decode(), "audio/webm")
