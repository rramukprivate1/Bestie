"""
database.py

SQLite for now (zero setup, a single file on disk) - swappable for
Postgres later (Phase 4) by changing DATABASE_URL alone; nothing else
in the app touches this connection detail directly.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

DATABASE_URL = settings.database_url

# check_same_thread is a SQLite-only quirk (SQLite objects to being used
# across threads by default) - Postgres doesn't need or accept this arg.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_session():
    """Call this, use it, then close it - see db/repository.py for the pattern."""
    return SessionLocal()
