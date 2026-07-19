# Companion — Full Project

This repo has two parts that run **separately, at the same time**, in two terminal windows:

- `frontend/` — the React PWA (what you actually see and use)
- `backend/` — the FastAPI service that now holds your Gemini API key and talks to Gemini on the frontend's behalf

## First time setting this up?

Follow these in order:
1. **`backend/README.md`** — get the backend running first (SQLite works out of the box; Neon is optional)
2. **`frontend/README.md`** — set up a free Firebase project (needed this phase — full steps included), then run the frontend

## Quick start (once you've done the one-time setup in each README)

**Terminal 1:**
```
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8080
```

**Terminal 2:**
```
cd frontend
npm run dev
```

Open the link `npm run dev` prints. Leave both terminals running while you use the app.

## Since Phase 5 shipped: a round of real fixes

A few things surfaced from actually running this: emotion tagging was silently costing a second Gemini call per message (now fixed — see `backend/README.md`'s rate limits section), a Docker shutdown bug, and — the important one — encryption breaking entirely when testing on a phone over a plain LAN address, because the Web Crypto API refuses to run outside a secure context. `frontend/README.md`'s "Getting it on your phone" section covers both the quick fix and the recommended one (which doubles as real Git/GitHub/Vercel deploy practice).

## What changed from Phase 4

Voice is real now, not stubbed. Tap the mic to record a message — it's transcribed and dropped into the input box for you to review before sending, same as typing. Every assistant reply has a small speaker icon to hear it read aloud, and a voice-mode toggle in the header auto-plays new replies as they arrive, for a genuinely hands-free conversation if you want it.

## Where this sits in the roadmap

This is **Phase 5** (Voice Layer) complete: speech-to-text and text-to-speech both run through Gemini (not the browser's built-in, often-robotic voices), sharing the same API key and the same request pattern the rest of the backend already uses.

Next up, whenever you're ready: **Phase 6** — a visible mood dashboard and journal/diary, surfacing the emotion data that's been quietly collected since Phase 3.
