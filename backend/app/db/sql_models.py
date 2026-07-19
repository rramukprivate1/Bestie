"""
sql_models.py

The two tables Phase 3 introduces. This is genuinely relational data -
time-series emotion tags and a history of evolving summaries - which is
exactly what SQL is good at (as opposed to the chat messages themselves,
which stay in the frontend's encrypted IndexedDB, or the semantic search
index, which lives in Chroma).
"""

from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, DateTime

from app.db.database import Base


class EmotionLog(Base):
    __tablename__ = "emotion_logs"

    message_id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    emotion = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class MemorySummary(Base):
    __tablename__ = "memory_summaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    summary_text = Column(String, nullable=False)
    message_count_at_creation = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
