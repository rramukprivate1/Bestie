"""
summarizer.py

Keeps a rolling, evolving summary of the conversation so far, refreshed
every SUMMARY_INTERVAL messages rather than on every single message
(keeps API usage down). This is what lets the profile grow on its own
over time instead of staying frozen at whatever the user typed during
onboarding.

Runs as a background task - if it fails or is skipped this cycle,
nothing about the current reply is affected; it just tries again once
enough new messages have accumulated.
"""

from app.services.llm_client import generate_reply
from app.db.repository import get_latest_summary, save_summary

SUMMARY_INTERVAL = 12

SUMMARY_INSTRUCTION = (
    "You maintain a compact, evolving memory summary of a person, written for another "
    "AI assistant to read as background context in future conversations. Merge anything "
    "new and durable from the recent conversation into the existing summary below. Keep "
    "it under 150 words, factual, third person, and focused on lasting facts and "
    "patterns (not restating minor day-to-day details). Output only the updated summary "
    "text, nothing else."
)


def _format_turns(turns: list[dict]) -> str:
    return "\n".join(f"{t['role']}: {t['text']}" for t in turns)


async def maybe_update_summary(user_id: str, current_message_count: int, recent_turns: list[dict]) -> None:
    latest = get_latest_summary(user_id)
    baseline = latest.message_count_at_creation if latest else 0

    if current_message_count - baseline < SUMMARY_INTERVAL:
        return

    prompt = (
        f"Existing summary:\n{latest.summary_text if latest else '(none yet)'}\n\n"
        f"Recent conversation:\n{_format_turns(recent_turns)}"
    )

    try:
        new_summary = await generate_reply(
            system_instruction=SUMMARY_INSTRUCTION,
            history=[],
            new_message=prompt,
            temperature=0.3,
        )
        save_summary(user_id, new_summary, current_message_count)
    except Exception:
        pass
