"""
Tests for /mood-summary - the day-by-day grouping logic in particular,
since that's pure Python (not SQL) and easy to get subtly wrong around
date boundaries.
"""

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import app
from app.db.repository import save_emotion_log

client = TestClient(app)


def test_mood_summary_returns_requested_number_of_days():
    response = client.get("/mood-summary", params={"user_id": "user-a", "days": 7})
    assert response.status_code == 200
    body = response.json()
    assert len(body["days"]) == 7


def test_mood_summary_groups_and_finds_dominant_emotion():
    save_emotion_log("user-b", "msg-1", "anxious")
    save_emotion_log("user-b", "msg-2", "anxious")
    save_emotion_log("user-b", "msg-3", "calm")

    response = client.get("/mood-summary", params={"user_id": "user-b", "days": 3})
    body = response.json()

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_entry = next(d for d in body["days"] if d["date"] == today)

    assert today_entry["emotions"] == {"anxious": 2, "calm": 1}
    assert today_entry["dominant"] == "anxious"


def test_mood_summary_empty_day_has_no_dominant():
    response = client.get("/mood-summary", params={"user_id": "user-with-no-history", "days": 3})
    body = response.json()
    assert all(d["dominant"] is None for d in body["days"])


def test_different_users_moods_never_mix():
    save_emotion_log("user-c", "msg-1", "hopeful")
    save_emotion_log("user-d", "msg-1", "frustrated")

    response_c = client.get("/mood-summary", params={"user_id": "user-c", "days": 1})
    response_d = client.get("/mood-summary", params={"user_id": "user-d", "days": 1})

    assert response_c.json()["days"][0]["dominant"] == "hopeful"
    assert response_d.json()["days"][0]["dominant"] == "frustrated"
