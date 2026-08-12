"""
llm_client.py

The only file that talks to Google's Gemini API. Your API key lives in this
backend's .env now, never shipped to the browser — that's the entire point
of Phase 2. If you switch LLM providers later, this is the only file that
needs to change.
"""

import asyncio

import httpx
from app.config import settings

MODEL = "gemini-3.5-flash"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

# A 503 ("model is currently experiencing high demand") is transient and
# often clears within a second or two - worth a couple of quick retries.
# A 429 (rate limit) is the opposite: retrying immediately just fails
# again since the per-minute window hasn't passed, so that one fails fast.
OVERLOAD_RETRY_DELAYS_SECONDS = [1, 2]

# Deliberately conservative - keeps this comfortably inside the free
# 5,000 grounded-queries/month allowance rather than searching by default.
CURRENT_INFO_SIGNALS = [
    "news", "today", "latest", "recent", "recently", "currently",
    "this week", "this month", "yesterday", "happening", "happened",
    "election", "who won", "score", "result", "announced", "announcement",
    "update on", "heard about", "did you hear",
]


def _might_need_current_info(message: str) -> bool:
    lowered = message.lower()
    return any(signal in lowered for signal in CURRENT_INFO_SIGNALS)

async def generate_reply(
    system_instruction: str,
    history: list[dict],
    new_message: str,
    temperature: float = 0.85,
) -> str:
    if not settings.gemini_api_key:
        raise ValueError("MISSING_API_KEY: Set GEMINI_API_KEY in backend/.env, then restart the server.")

    contents = [{"role": turn["role"], "parts": [{"text": turn["text"]}]} for turn in history]
    contents.append({"role": "user", "parts": [{"text": new_message}]})

    body = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": contents,
        "generationConfig": {"temperature": temperature, "topP": 0.92, "maxOutputTokens": 2048},
    }
    
    if _might_need_current_info(new_message):
        body["tools"] = [{"google_search": {}}]

    resp = await _post_with_overload_retry(body)

    if resp.status_code == 429:
        raise ValueError("RATE_LIMIT: Free tier rate limit hit — wait a minute and try again.")

    if resp.status_code != 200:
        try:
            detail = resp.json().get("error", {}).get("message", f"status {resp.status_code}")
        except Exception:
            detail = f"status {resp.status_code}"
        raise ValueError(f"API_ERROR: {detail}")

    data = resp.json()
    candidates = data.get("candidates", [])
    parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
    text = "".join(p.get("text", "") for p in parts)

    if not text:
        reason = candidates[0].get("finishReason", "unknown") if candidates else "unknown"
        raise ValueError(f"EMPTY_REPLY: Gemini returned no text (reason: {reason}).")

    return text.strip()


async def _post_with_overload_retry(body: dict) -> httpx.Response:
    attempts = len(OVERLOAD_RETRY_DELAYS_SECONDS) + 1
    last_response = None

    for attempt in range(attempts):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    API_URL, json=body, headers={"x-goog-api-key": settings.gemini_api_key}
                )
        except httpx.RequestError:
            raise ValueError("NETWORK_ERROR: Could not reach Gemini from the server — check its internet connection.")

        if resp.status_code != 503:
            return resp

        last_response = resp
        if attempt < len(OVERLOAD_RETRY_DELAYS_SECONDS):
            await asyncio.sleep(OVERLOAD_RETRY_DELAYS_SECONDS[attempt])

    return last_response
