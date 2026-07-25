"""
repository.py

Small, plain functions for reading/writing the SQL tables - the only
file that should import sql_models directly. Services (summarizer,
emotion_tagger) call these instead of touching SQLAlchemy sessions
themselves.
"""

from datetime import datetime

from app.db import database
from app.db.sql_models import EmotionLog, MemorySummary


def save_emotion_log(user_id: str, message_id: str, emotion: str) -> None:
    session = database.get_session()
    try:
        session.merge(EmotionLog(message_id=message_id, user_id=user_id, emotion=emotion))
        session.commit()
    finally:
        session.close()


def get_latest_summary(user_id: str) -> MemorySummary | None:
    session = database.get_session()
    try:
        return (
            session.query(MemorySummary)
            .filter(MemorySummary.user_id == user_id)
            .order_by(MemorySummary.created_at.desc())
            .first()
        )
    finally:
        session.close()


def save_summary(user_id: str, summary_text: str, message_count: int) -> None:
    session = database.get_session()
    try:
        session.add(
            MemorySummary(
                user_id=user_id, summary_text=summary_text, message_count_at_creation=message_count
            )
        )
        session.commit()
    finally:
        session.close()


def get_recent_emotions(user_id: str, since: datetime) -> list[EmotionLog]:
    """Raw rows only - grouping by day happens in Python (see routes/mood.py),
    not SQL, so this works identically whether you're on SQLite or Postgres."""
    session = database.get_session()
    try:
        return (
            session.query(EmotionLog)
            .filter(EmotionLog.user_id == user_id, EmotionLog.created_at >= since)
            .order_by(EmotionLog.created_at.asc())
            .all()
        )
    finally:
        session.close()
