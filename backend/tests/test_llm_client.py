"""
Tests the automatic retry for Gemini's transient "model overloaded" (503)
response - distinct from a 429 rate limit, which should NOT retry
immediately since the per-minute window hasn't passed yet.
"""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.services.llm_client import generate_reply


def _make_response(status_code, json_body):
    request = httpx.Request("POST", "https://example.com")
    return httpx.Response(status_code=status_code, json=json_body, request=request)


@pytest.mark.asyncio
async def test_retries_once_on_503_then_succeeds(monkeypatch):
    monkeypatch.setattr("app.config.settings.gemini_api_key", "fake-key-for-test")
    monkeypatch.setattr("asyncio.sleep", AsyncMock())  # don't actually wait during tests

    responses = [
        _make_response(503, {"error": {"message": "model overloaded"}}),
        _make_response(200, {"candidates": [{"content": {"parts": [{"text": "hey there"}]}}]}),
    ]

    with patch("httpx.AsyncClient.post", AsyncMock(side_effect=responses)):
        result = await generate_reply(system_instruction="be nice", history=[], new_message="hi")

    assert result == "hey there"


@pytest.mark.asyncio
async def test_rate_limit_fails_immediately_without_retrying(monkeypatch):
    monkeypatch.setattr("app.config.settings.gemini_api_key", "fake-key-for-test")

    mock_post = AsyncMock(return_value=_make_response(429, {"error": {"message": "rate limited"}}))

    with patch("httpx.AsyncClient.post", mock_post):
        with pytest.raises(ValueError, match="RATE_LIMIT"):
            await generate_reply(system_instruction="be nice", history=[], new_message="hi")

    assert mock_post.call_count == 1
