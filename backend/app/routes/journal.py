"""
routes/journal.py

Journal entries and saved quotes/reflections live in Firestore (the
frontend writes them directly, same as chat messages) - this endpoint's
only job is embedding their plaintext into the same per-user Chroma
collection chat messages use, tagged by type, so the assistant can
naturally recall a journal entry or a favorite quote in later
conversation exactly like it recalls anything you've said in chat.
"""

import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.db import vector_store

logger = logging.getLogger(__name__)
router = APIRouter()


class IndexJournalRequest(BaseModel):
    user_id: str
    entry_id: str
    text: str
    entry_type: str = "entry"  # 'entry' (a journal entry) or 'quote' (a saved quote/reflection)


class IndexJournalResponse(BaseModel):
    indexed: bool


@router.post("/index-journal", response_model=IndexJournalResponse)
async def index_journal(req: IndexJournalRequest):
    # Same best-effort treatment as the chat route's memory indexing - a
    # failed embed shouldn't block saving a journal entry, which already
    # succeeded in Firestore by the time this is called.
    try:
        collection = vector_store.get_collection(req.user_id)
        vector_store.index_messages(collection, [(req.entry_id, req.text, {"role": req.entry_type})])
        return IndexJournalResponse(indexed=True)
    except Exception:
        logger.exception("Could not index journal entry into the memory layer - entry is still saved in Firestore.")
        return IndexJournalResponse(indexed=False)
