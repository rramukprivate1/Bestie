"""
Tests for emotion_tagger.py's parsing logic - the fix that removed a
whole second Gemini call per message (previously: classify_emotion made
its own API request for every single message, quietly doubling usage
against the free tier's already-tight rate limit).
"""

from app.services.emotion_tagger import extract_emotion_tag


def test_extracts_emotion_and_strips_it_from_the_visible_reply():
    raw = "That sounds like a lot to carry today.\n###EMOTION:anxious###"
    clean, emotion = extract_emotion_tag(raw)
    assert clean == "That sounds like a lot to carry today."
    assert emotion == "anxious"


def test_is_case_and_whitespace_tolerant():
    raw = "Glad you told me!   \n  ###emotion: Hopeful ###  "
    clean, emotion = extract_emotion_tag(raw)
    assert clean == "Glad you told me!"
    assert emotion == "hopeful"


def test_missing_tag_returns_original_text_and_no_emotion():
    raw = "Just a normal reply with no tag at all."
    clean, emotion = extract_emotion_tag(raw)
    assert clean == raw
    assert emotion is None


def test_chat_endpoint_only_calls_the_llm_once_per_message(monkeypatch):
    """Confirms the actual fix: one user message should mean exactly one
    Gemini call, not two (main reply + a separate emotion classification)."""
    from fastapi.testclient import TestClient
    from app.main import app

    call_count = {"n": 0}

    async def fake_generate_reply(system_instruction, history, new_message, temperature=0.85):
        call_count["n"] += 1
        return "hey, that makes sense.\n###EMOTION:calm###"

    monkeypatch.setattr("app.routes.chat.generate_reply", fake_generate_reply)

    client = TestClient(app)
    response = client.post(
        "/chat",
        json={"user_id": "user-a", "message_id": "msg-1", "message_count": 0, "message": "just a normal day"},
    )

    assert response.status_code == 200
    assert response.json() == {"reply": "hey, that makes sense."}
    assert call_count["n"] == 1
