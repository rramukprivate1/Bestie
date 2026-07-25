"""
routes/mood.py

Powers the Insights view's mood strip. Reads the emotion tags that have
been quietly collected since Phase 3 (piggybacked on replies since the
Phase 5 fix, costing zero extra API calls) and groups them by day - in
Python, not SQL, so the exact same code works on SQLite or Postgres/Neon
without dialect-specific date functions.
"""

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from app.db.repository import get_recent_emotions

router = APIRouter()

DEFAULT_DAYS = 14


class DayMood(BaseModel):
    date: str  # YYYY-MM-DD
    emotions: dict[str, int]  # e.g. {"anxious": 2, "calm": 1}
    dominant: str | None


class MoodSummaryResponse(BaseModel):
    days: list[DayMood]


@router.get("/mood-summary", response_model=MoodSummaryResponse)
async def mood_summary(user_id: str, days: int = DEFAULT_DAYS):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    logs = get_recent_emotions(user_id, since)

    by_day: dict[str, Counter] = defaultdict(Counter)
    for log in logs:
        day_key = log.created_at.strftime("%Y-%m-%d")
        by_day[day_key][log.emotion] += 1

    result = []
    for i in range(days):
        day = (datetime.now(timezone.utc) - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        counts = by_day.get(day, Counter())
        dominant = counts.most_common(1)[0][0] if counts else None
        result.append(DayMood(date=day, emotions=dict(counts), dominant=dominant))

    return MoodSummaryResponse(days=result)
