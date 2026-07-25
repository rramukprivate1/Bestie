"""
Tests for /index-journal - confirms journal entries and saved quotes
land in the same per-user Chroma collection chat uses (so they're
recallable in normal conversation), tagged by type.
"""

from fastapi.testclient import TestClient

from app.main import app
from app.db import vector_store

client = TestClient(app)


def test_journal_entry_gets_indexed_and_is_recallable_in_chat(monkeypatch):
    response = client.post(
        "/index-journal",
        json={"user_id": "user-a", "entry_id": "j-1", "text": "Started therapy today, feeling hopeful about it."},
    )
    assert response.status_code == 200
    assert response.json() == {"indexed": True}

    captured_prompts = []

    async def fake_generate_reply(system_instruction, history, new_message, temperature=0.85):
        captured_prompts.append(system_instruction)
        return "that's great to hear"

    monkeypatch.setattr("app.routes.chat.generate_reply", fake_generate_reply)

    client.post(
        "/chat",
        json={
            "user_id": "user-a",
            "message_id": "msg-1",
            "message_count": 0,
            "message": "Started therapy today, feeling hopeful about it.",
        },
    )

    assert "past conversations" in captured_prompts[-1]


def test_saved_quote_is_tagged_distinctly_from_journal_entries():
    collection = vector_store.get_collection("user-quote-test")
    response = client.post(
        "/index-journal",
        json={"user_id": "user-quote-test", "entry_id": "q-1", "text": "Not all who wander are lost.", "entry_type": "quote"},
    )
    assert response.status_code == 200

    result = collection.get(ids=["q-1"])
    assert result["metadatas"][0]["role"] == "quote"
