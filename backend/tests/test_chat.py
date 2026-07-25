"""
Run all tests with:
    pytest

Note: the isolated_vector_store and isolated_sql_db fixtures (see
conftest.py) apply automatically to every test below - Chroma and SQL
both point at throwaway, network-free test copies, never your real data.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_without_api_key_returns_clear_error(monkeypatch):
    monkeypatch.setattr("app.config.settings.gemini_api_key", "")
    response = client.post("/chat", json={"user_id": "user-a", "message": "hello", "message_id": "msg-1"})
    assert response.status_code == 502
    assert "MISSING_API_KEY" in response.json()["detail"]


def test_chat_full_flow_with_mocked_llm(monkeypatch):
    """Exercises the real pipeline end to end - indexing, retrieval, prompt
    assembly, background tasks - without calling the real Gemini API."""

    async def fake_generate_reply(system_instruction, history, new_message, temperature=0.85):
        assert "warm" in system_instruction.lower()  # persona made it into the prompt
        return "That sounds like a lot to carry - I'm glad you told me."

    monkeypatch.setattr("app.routes.chat.generate_reply", fake_generate_reply)

    response = client.post(
        "/chat",
        json={
            "user_id": "user-a",
            "message_id": "msg-101",
            "message_count": 4,
            "profile_summary": "28, works in design, based in Chennai.",
            "pinned_memories": [{"id": "msg-12", "text": "Went through a breakup last month"}],
            "history": [
                {"id": "msg-99", "role": "user", "text": "hey, rough day"},
                {"id": "msg-100", "role": "model", "text": "hey - what happened?"},
            ],
            "message": "just feeling really anxious about money lately",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"reply": "That sounds like a lot to carry - I'm glad you told me."}


def test_second_message_can_retrieve_the_first_via_rag(monkeypatch):
    """Confirms the actual point of Phase 3/4: something said earlier gets
    surfaced again later, without being pinned or in recent history."""

    captured_prompts = []

    async def fake_generate_reply(system_instruction, history, new_message, temperature=0.85):
        captured_prompts.append(system_instruction)
        return "noted"

    monkeypatch.setattr("app.routes.chat.generate_reply", fake_generate_reply)

    client.post(
        "/chat",
        json={
            "user_id": "user-a",
            "message_id": "msg-1",
            "message_count": 0,
            "message": "I'm saving up for a trip to Ladakh next year",
        },
    )
    client.post(
        "/chat",
        json={
            "user_id": "user-a",
            "message_id": "msg-2",
            "message_count": 2,
            "history": [],
            "message": "I'm saving up for a trip to Ladakh next year",
        },
    )

    assert "past conversations" in captured_prompts[-1]


def test_two_users_memories_never_mix(monkeypatch):
    """The actual point of Phase 4's backend change: user A's memories must
    never surface in user B's conversation, even with identical message text."""

    captured_prompts = []

    async def fake_generate_reply(system_instruction, history, new_message, temperature=0.85):
        captured_prompts.append(system_instruction)
        return "noted"

    monkeypatch.setattr("app.routes.chat.generate_reply", fake_generate_reply)

    # User A mentions something distinctive.
    client.post(
        "/chat",
        json={"user_id": "user-a", "message_id": "msg-1", "message_count": 0, "message": "my dog Biscuit is sick"},
    )

    # User B sends the exact same text - should NOT retrieve user A's memory
    # of it, because they don't have one yet under their own user_id.
    client.post(
        "/chat",
        json={"user_id": "user-b", "message_id": "msg-1", "message_count": 0, "message": "my dog Biscuit is sick"},
    )

    assert "past conversations" not in captured_prompts[-1]


def test_retries_once_when_reply_is_empty_after_stripping_the_tag(monkeypatch):
    """Reproduces the bug from a real screenshot: a malformed/truncated tag
    left nothing behind after stripping, and that empty string used to get
    sent to the frontend as if it were a real reply."""

    call_count = {"n": 0}

    async def fake_generate_reply(system_instruction, history, new_message, temperature=0.85):
        call_count["n"] += 1
        if call_count["n"] == 1:
            return "###EM"  # first attempt: nothing usable, just a mangled tag
        return "Sorry about that - I'm here now.\n###EMOTION:calm###"

    monkeypatch.setattr("app.routes.chat.generate_reply", fake_generate_reply)

    response = client.post(
        "/chat",
        json={"user_id": "user-e", "message_id": "msg-1", "message_count": 0, "message": "hello?"},
    )

    assert response.status_code == 200
    assert response.json() == {"reply": "Sorry about that - I'm here now."}
    assert call_count["n"] == 2


def test_gives_a_clear_error_if_every_retry_comes_back_empty(monkeypatch):
    async def fake_generate_reply(system_instruction, history, new_message, temperature=0.85):
        return "###EM"  # every attempt fails to produce usable text

    monkeypatch.setattr("app.routes.chat.generate_reply", fake_generate_reply)

    response = client.post(
        "/chat",
        json={"user_id": "user-f", "message_id": "msg-1", "message_count": 0, "message": "hello?"},
    )

    assert response.status_code == 502
    assert "EMPTY_REPLY" in response.json()["detail"]
