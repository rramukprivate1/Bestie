"""
routes/chat.py

The single endpoint the frontend calls to talk to the assistant. Phase 4
adds a user_id to every request, scoping memory (Chroma collection) and
SQL rows (emotion logs, summaries) per account - this is what makes it
safe for the same backend to eventually serve more than one person's
data without it ever mixing together.

NOTE ON TRUST: user_id here is whatever the frontend sends (the signed-in
Firebase user's uid) - it is not cryptographically verified against a
Firebase ID token. That's fine for a personal project where you are the
only real user, but before this could ever serve untrusted multiple
users, the correct next step is verifying the ID token server-side with
the Firebase Admin SDK rather than trusting the field as-is.
"""

import logging

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from app.services.llm_client import generate_reply
from app.services.prompt_builder import build_system_instruction
from app.services.emotion_tagger import extract_emotion_tag, save_emotion_background
from app.services.summarizer import maybe_update_summary
from app.db import vector_store
from app.db.repository import get_latest_summary

logger = logging.getLogger(__name__)
router = APIRouter()


class HistoryTurn(BaseModel):
    id: str
    role: str  # 'user' or 'model'
    text: str


class PinnedMemory(BaseModel):
    id: str
    text: str


class ChatRequest(BaseModel):
    user_id: str
    message_id: str
    message_count: int = 0  # how many messages exist before this one, from the frontend
    profile_summary: str = ""
    pinned_memories: list[PinnedMemory] = Field(default_factory=list)
    history: list[HistoryTurn] = Field(default_factory=list)
    message: str
    temperature: float = 0.85


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, background_tasks: BackgroundTasks):
    # The memory layer (Chroma) is treated as best-effort, not critical path:
    # its embedding model downloads on first use, which can occasionally fail
    # (flaky connection, a firewall, antivirus interference). If it does, the
    # conversation should still work - it just runs that one turn without
    # long-term recall, rather than the whole reply failing over a
    # non-essential feature.
    retrieved_memories = []
    try:
        collection = vector_store.get_collection(req.user_id)

        # 1. Index this turn's messages (idempotent - safe even if seen before).
        to_index = [(t.id, t.text, {"role": t.role}) for t in req.history]
        to_index.append((req.message_id, req.message, {"role": "user"}))
        vector_store.index_messages(collection, to_index)

        # 2. Pull in anything semantically relevant from further back, skipping
        #    whatever's already directly in this request (history + pinned + itself).
        already_included = {str(t.id) for t in req.history}
        already_included |= {str(p.id) for p in req.pinned_memories}
        already_included.add(str(req.message_id))
        retrieved_memories = vector_store.query_relevant_memories(
            collection, query_text=req.message, exclude_ids=already_included, top_k=5
        )
    except Exception:
        logger.exception("Memory layer (Chroma) failed for this turn - continuing without long-term recall.")

    # 3. The auto-evolving summary the summarizer maintains (may not exist yet).
    derived_summary = None
    try:
        latest_summary_row = get_latest_summary(req.user_id)
        derived_summary = latest_summary_row.summary_text if latest_summary_row else None
    except Exception:
        logger.exception("Could not read the derived memory summary - continuing without it.")

    # 4. Build the prompt and get the reply.
    system_instruction = build_system_instruction(
        profile_summary=req.profile_summary,
        pinned_memories=[{"text": p.text} for p in req.pinned_memories],
        derived_summary=derived_summary,
        retrieved_memories=retrieved_memories,
    )
    history_for_llm = [{"role": t.role, "text": t.text} for t in req.history]

    # A reply that's empty once the emotion tag is stripped out (rare, but
    # seen in practice - the model occasionally returns almost nothing but
    # the tag itself) would otherwise show up as a blank message bubble and
    # then fail confusingly if voice mode tries to speak it. One retry
    # clears this the vast majority of the time.
    reply, emotion = "", None
    for attempt in range(2):
        try:
            raw_reply = await generate_reply(
                system_instruction=system_instruction,
                history=history_for_llm,
                new_message=req.message,
                temperature=req.temperature if attempt == 0 else min(req.temperature + 0.1, 1.0),
            )
        except ValueError as e:
            raise HTTPException(status_code=502, detail=str(e))

        reply, emotion = extract_emotion_tag(raw_reply)
        if reply:
            break

    if not reply:
        raise HTTPException(status_code=502, detail="EMPTY_REPLY: Gemini returned no usable text after retrying.")

    # 5. Fire-and-forget background work - none of this delays the response above.
    #    Note: this no longer costs a Gemini call at all (see emotion_tagger.py) -
    #    it's just writing the already-parsed emotion to SQL.
    background_tasks.add_task(save_emotion_background, req.user_id, str(req.message_id), emotion)

    turns_for_summary = history_for_llm + [
        {"role": "user", "text": req.message},
        {"role": "model", "text": reply},
    ]
    background_tasks.add_task(
        maybe_update_summary, req.user_id, req.message_count + 2, turns_for_summary
    )

    return ChatResponse(reply=reply)
