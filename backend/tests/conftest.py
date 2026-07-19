"""
conftest.py

Shared test fixtures. The real app (see db/vector_store.py) uses Chroma's
bundled default embedding model, which downloads a small model file on
first use - fine for normal, real usage, but tests shouldn't depend on
network access or a slow first-run download. This fixture swaps in a
trivial, deterministic, network-free embedding function for every test,
and gives each test its own throwaway Chroma directory so tests can't
see each other's data.
"""

import hashlib

import chromadb
import pytest
from chromadb import EmbeddingFunction

from app.db import vector_store


class _HashEmbedding(EmbeddingFunction):
    """Deterministic stand-in for tests only - not semantically meaningful,
    just enough to exercise upsert/query code paths without the network."""

    def __init__(self):
        pass

    @staticmethod
    def name() -> str:
        return "hash-embedding-test-stub"

    def get_config(self) -> dict:
        return {}

    def __call__(self, input):
        return [[b / 255.0 for b in hashlib.sha256(text.lower().encode()).digest()[:32]] for text in input]


@pytest.fixture(autouse=True)
def isolated_vector_store(tmp_path, monkeypatch):
    vector_store._client = None
    vector_store._collections = {}

    def fake_get_collection(user_id: str):
        client = chromadb.PersistentClient(path=str(tmp_path / "chroma_test"))
        return client.get_or_create_collection(f"test_memories_{user_id}", embedding_function=_HashEmbedding())

    monkeypatch.setattr(vector_store, "get_collection", fake_get_collection)
    yield
    vector_store._client = None
    vector_store._collections = {}


@pytest.fixture(autouse=True)
def isolated_sql_db(tmp_path, monkeypatch):
    """Points the SQL layer at a throwaway SQLite file per test instead of
    the real companion.db, so tests never touch real user data."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.db import database
    from app.db import sql_models  # noqa: F401 (registers models on Base before create_all)

    test_engine = create_engine(f"sqlite:///{tmp_path}/test.db", connect_args={"check_same_thread": False})
    database.Base.metadata.create_all(test_engine)
    TestSession = sessionmaker(bind=test_engine)

    monkeypatch.setattr(database, "SessionLocal", TestSession)
    monkeypatch.setattr(database, "get_session", lambda: TestSession())
    yield
