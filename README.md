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

## What changed from Phase 5

Two new tabs, Journal and Insights. Journal entries and saved quotes feed back into the same memory search chat uses, so they can come up naturally later. Insights shows a 14-day mood strip from the emotion data collected since Phase 3, plus a timeline of everything you've pinned in chat or saved in your journal.

## Where this sits in the roadmap

This is **Phase 6** (Emotional Intelligence & Personality Features) complete: mood tracking is finally visible, journaling and saved quotes are real and feed the memory system, and pinned highlights have a dedicated place to be looked back on.

Everything through Phase 6 is a complete, working personal product on its own. What's left in the original roadmap (UI polish, deeper DevOps practice, and the optional Play Store fork) is refinement rather than core functionality — pick up whichever matters most to you, whenever you're ready.

## Since Phase 6 shipped: another round of real fixes

Caught from an actual conversation: a malformed or truncated emotion tag could leak visibly into a reply (that `###EM` fragment) or, worse, leave nothing behind at all — sent to you as a blank message that then failed confusingly if voice mode tried to speak it. Both are fixed: tag-stripping is now robust to partial/malformed tags, and an empty-after-stripping reply triggers one automatic retry before ever reaching you. The assistant's own persona also now knows it genuinely has voice capabilities, instead of telling people it can't play audio.

Also: testing voice never actually required a phone — `frontend/README.md` now leads with testing it directly on your computer, which needs zero extra setup. Phone testing itself got simplified down to the one path confirmed to actually work (Vercel), with the missing piece — how your phone reaches a backend that only runs on your PC — spelled out explicitly (ngrok for a testing session, or real backend deployment for something permanent).

## Since then: Groq transcription, and the backend finally has a permanent home

Two real additions:

- **Voice transcription now prefers Groq's free Whisper API** over Gemini, when you set up a (free) Groq key — faster, strong multilingually, and it no longer touches Gemini's tighter rate limit at all. Falls back to Gemini automatically if you haven't set one up, or if Groq itself has a problem. Nothing about what gets remembered changes either way — see `backend/README.md`.
- **The backend can now actually be deployed, permanently** — Google Cloud Run, using the same `Dockerfile` from Phase 2, with `.github/workflows/deploy.yml` automatically redeploying it every time you push a change. This is what finally resolves the `NETWORK_ERROR` from testing the Vercel-hosted frontend: instead of a temporary `ngrok` tunnel to your PC, the frontend now talks to a real, permanent URL. Full setup (Cloud Run first, then wiring up the GitHub Actions automation on top of it) is in `backend/README.md`'s new "Deploying to Cloud Run" section — genuinely the most involved setup step in this project so far, worth doing once, carefully.
