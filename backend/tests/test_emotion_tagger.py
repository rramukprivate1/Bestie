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


def test_partial_or_malformed_tag_is_still_stripped():
    # Exactly the bug seen in practice: a cut-short tag with no way to
    # parse an emotion out of it should still never leak into the reply.
    raw = "100% okay. Please don't worry.\n###EM"
    clean, emotion = extract_emotion_tag(raw)
    assert clean == "100% okay. Please don't worry."
    assert emotion is None


def test_partial_tag_variants_all_get_stripped():
    for fragment in ["###EMOTION", "###EMOTION:", "###EMOTION:anx"]:
        clean, _ = extract_emotion_tag(f"Hey there.\n{fragment}")
        assert clean == "Hey there."
        assert "###" not in clean


def test_triple_hash_mid_sentence_is_left_alone():
    # The defensive fallback is end-anchored - it should never eat real
    # content that isn't actually a trailing tag fragment.
    raw = "I use ### as a divider sometimes, just so you know."
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
