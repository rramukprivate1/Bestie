"""
emotion_tagger.py

Emotion detection used to be a second Gemini call per message (Phase 3
original version) - that quietly doubled API usage for every single
message, which is exactly what was eating into the free tier's already
tight rate limit. Now it's parsed for free out of the main reply itself
(see the ###EMOTION:<word>### instruction in prompt_builder.py) - zero
extra API calls, same information.
"""

import re

from app.db.repository import save_emotion_log

EMOTION_TAG_PATTERN = re.compile(r"\s*###EMOTION:\s*(\w+)\s*###\s*", re.IGNORECASE)


def extract_emotion_tag(raw_reply: str) -> tuple[str, str | None]:
    """
    Splits the model's raw reply into (clean_reply_for_the_user, emotion_or_None).
    If the model didn't follow the format for some reason, clean_reply is just
    the original text unchanged and emotion is None - logging an emotion is a
    nice-to-have, never something that should risk mangling the visible reply.
    """
    match = EMOTION_TAG_PATTERN.search(raw_reply)
    if not match:
        return raw_reply, None

    emotion = match.group(1).lower()
    clean_reply = EMOTION_TAG_PATTERN.sub("", raw_reply).strip()
    return clean_reply, emotion


def save_emotion_background(user_id: str, message_id: str, emotion: str | None) -> None:
    if emotion:
        save_emotion_log(user_id, message_id, emotion)
