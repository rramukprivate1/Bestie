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

# The well-formed pattern: ###EMOTION:word###
EMOTION_TAG_PATTERN = re.compile(r"\s*###EMOTION:\s*(\w+)\s*###\s*", re.IGNORECASE)

# Defensive fallback: catches a *partial* tag with nothing to parse from it
# (e.g. "###EM" or "###EMOTION:anx" when a response gets cut short) - only
# anchored at the very end of the text, so it can never eat something that
# just happens to contain "###" mid-sentence.
PARTIAL_TAG_PATTERN = re.compile(r"\s*###[A-Za-z:]*\s*$")


def extract_emotion_tag(raw_reply: str) -> tuple[str, str | None]:
    """
    Splits the model's raw reply into (clean_reply_for_the_user, emotion_or_None).
    Two passes: the well-formed tag first (also gives us the emotion word),
    then a defensive sweep for any leftover partial tag fragment - so a
    malformed or truncated tag can never leak into what the user sees, even
    when there's no usable emotion to extract from it.
    """
    match = EMOTION_TAG_PATTERN.search(raw_reply)
    if match:
        emotion = match.group(1).lower()
        clean_reply = EMOTION_TAG_PATTERN.sub("", raw_reply).strip()
        return clean_reply, emotion

    clean_reply = PARTIAL_TAG_PATTERN.sub("", raw_reply).strip()
    return clean_reply, None


def save_emotion_background(user_id: str, message_id: str, emotion: str | None) -> None:
    if emotion:
        save_emotion_log(user_id, message_id, emotion)
