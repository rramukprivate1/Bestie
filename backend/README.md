# Companion Backend (Phase 5)

This is the part that holds your Gemini API key, builds every prompt, remembers things long-term via a real search index over past conversations (Phase 3), keeps each account's data separate (Phase 4), and — as of Phase 5 — handles real speech in and out. It's a small Python web service (FastAPI).

## 0. Install Python (if you haven't)

Go to **[python.org/downloads](https://www.python.org/downloads/)**, get the latest version, run the installer.
**On Windows:** the installer has a checkbox that says **"Add Python to PATH"** — tick it. Easy to miss, important.

Check it worked:
```
python3 --version
```
(On Windows this might only work as `python --version` instead — try both if one fails.)

## 1. Create a virtual environment

This keeps this project's Python packages separate from everything else on your computer. Inside this `backend` folder:
```
python3 -m venv .venv
```
Then activate it:
- **Mac/Linux:** `source .venv/bin/activate`
- **Windows:** `.venv\Scripts\activate`

You'll know it worked because your terminal prompt gets a `(.venv)` prefix in front of it. **Do this every time** you open a new terminal window to work on the backend.

## 2. Install dependencies
```
pip install -r requirements.txt
```

## 3. Set up the database (new in Phase 3)

This creates `companion.db` (a local SQLite file) with the tables the app needs:
```
alembic upgrade head
```
You'll see a couple of lines starting with `INFO` - that's normal, it means it worked. Run this once now, and again any time you pull a version of this project with new migrations in `alembic/versions/`.

## 3b. (Optional) Switch to Neon instead of local SQLite

Skip this and everything above still works fine on local SQLite — come back to this whenever you actually want the database in the cloud too, not just Firestore.

1. Go to **[neon.tech](https://neon.tech)**, sign up free (no card required), create a project (any name, default Postgres version, a region near you).
2. Neon's dashboard shows a **Connect** modal with a connection string. You need **two versions** of it:
   - The one with **`-pooler`** in the hostname → paste as `DATABASE_URL`
   - The **direct** one, without `-pooler` → paste as `DATABASE_URL_UNPOOLED` (migrations need the direct connection - the pooled one can break the DDL statements Alembic issues)
3. Put both in `.env` (Step 4 below covers creating that file).
4. Run `alembic upgrade head` again — this time it creates the tables in Neon instead of your local `companion.db`.

## 4. Add your API key

Copy `.env.example` to a new file named exactly `.env`, in this same folder. Open it and paste in the **same Gemini key you got in Phase 1**:
```
GEMINI_API_KEY=AIzaSy_your_actual_key_here
```
If you did Step 3b, your two Neon connection strings go in this same `.env` file.

## 5. Run it
```
uvicorn app.main:app --reload --port 8080
```
Leave this running. Visit `http://localhost:8080/health` in any browser — you should see `{"status":"ok"}`. That confirms it's alive and correctly configured.

The first time you actually send a message, you'll notice a short pause before the reply — that's Chroma (the memory search index) downloading its small embedding model in the background, a one-time thing that gets cached after.

Now start the frontend (`frontend/README.md`) in a **second, separate terminal window** — this backend terminal needs to stay open and running at the same time.

## What's new on disk in Phase 3

Two things get created the first time you run the app, both already in `.gitignore` (never commit either):
- **`companion.db`** — a SQLite file holding emotion tags and the auto-evolving memory summary
- **`chroma_data/`** — a folder holding the vector search index over everything you've ever said to it

Neither existing on a fresh clone of this repo, and neither should be shared or synced anywhere — they're a growing record of your actual conversations.

## What Phase 3 actually changes about how it "remembers"

Phase 1 and 2 sent your full profile, pinned messages, and recent chat with every request — fine at first, but it doesn't scale as history grows. Phase 3 adds real long-term memory:

- Every message is embedded and stored in a local vector search index (Chroma) as it passes through
- Each new message triggers a semantic search over everything you've ever said, pulling in whatever's actually relevant — not just recent or pinned
- Every so often (every 12 messages by default, see `SUMMARY_INTERVAL` in `app/services/summarizer.py`), the backend asks the model to fold recent conversation into a compact, evolving summary — so the profile keeps growing instead of staying frozen at whatever you typed during onboarding
- Each message also gets tagged with a one-word emotion (stored in `companion.db`) — not shown anywhere yet, that's Phase 6's mood dashboard, but the data's being collected from now on. This piggybacks on the main reply itself (a trailing, hidden `###EMOTION:word###` line the model adds and the backend strips before you ever see it) rather than costing a second API call — see the rate limits section below for why that distinction matters.

None of this is visible in the UI yet — it's working underneath what you already see, making the existing chat quietly smarter as history builds up.

## What Phase 4 adds on top of that

Every request now carries a `user_id` (the signed-in Firebase account's uid, from the frontend). The backend uses it to keep each account's memory search index (Chroma) and SQL rows (emotion logs, the evolving summary) completely separate — so if this ever serves more than one real account, nobody's memories leak into anyone else's.

**Worth knowing:** `user_id` is trusted as sent by the frontend right now — it is not cryptographically verified against a Firebase ID token server-side. That's a reasonable simplification while you're the only real user, but it's not the correct design for untrusted multiple users. The proper next step, if that ever changes, is verifying the ID token with the `firebase-admin` Python package instead of trusting the field as-is.

## What Phase 5 adds: real voice

Two new endpoints, both using the same Gemini API key as everything else:
- **`/transcribe`** — takes a recorded audio clip, returns the spoken text (used when you tap the mic)
- **`/speak`** — takes text, returns a WAV audio clip of it spoken aloud (used by each message's speaker icon, and by voice-mode auto-play)

Both deliberately use the same `generateContent` REST pattern as the rest of this backend (`llm_client.py`) rather than Gemini's newer Live API or Interactions API. Neither of those was the right fit here: this app doesn't need a persistent bidirectional audio session (Live API's whole reason to exist), and Interactions API's main advantage — server-side conversation state — would work against the custom memory system Phase 3 already built. `generateContent` remains fully supported by Google specifically for stateless calls like these, so switching wasn't worth the risk to already-working code.

One quirk worth knowing about, handled already: Gemini's TTS model occasionally returns text instead of audio on a given attempt. `voice_client.py` retries once automatically before giving up - if you ever see a `SPEAK_ERROR`, it already tried twice.

## Rate limits — what they actually are, and what's been done about it

The free tier is genuinely tight: roughly **10-15 requests per minute** for the flash model this app uses (check your exact current limits in Google AI Studio, since these do shift over time). It's easy to hit this faster than it sounds, for a reason worth understanding rather than just working around:

**Every user message used to cost *two* Gemini calls, not one** — the reply itself, plus a separate call just to classify its emotion. That silently halved your effective messages-per-minute before you'd typed a thing. This has been fixed: emotion detection now rides along on the main reply (a hidden line the model appends and the backend strips out) instead of a second API call — see `app/services/emotion_tagger.py`. One user message is now one Gemini call again, for text.

**Voice adds real, unavoidable extra calls, because they're the feature, not overhead to trim**: speaking a message costs a `/transcribe` call, and hearing a reply costs a `/speak` call, on top of the normal reply. A fully spoken exchange (you speak, it replies, you hear it) is genuinely 3 calls, not 1 - voice mode's auto-play adds a 4th automatically. This is inherent to what voice *is*, not a bug — worth pacing accordingly on the free tier.

**If the tight limit is a real problem for how you want to use this:** the practical fix is enabling billing on the same Google Cloud project your API key already belongs to (Google AI Studio → the billing prompt). Paid-tier rate limits are dramatically higher (100+ RPM rather than 10-15), and Flash-tier pricing is low enough that a single person's realistic daily use — even with voice — typically comes out to a small monthly cost, not a large one. It also switches off the free tier's "your prompts may be used to improve Google's products" data policy mentioned back in Phase 1, if that matters to you too. This is a genuine tradeoff to decide for yourself, not something to enable by default — zero cost was the explicit goal at the start of this project.

## Handling transient Gemini errors

Two different error messages you might see mean two different things:
- **`RATE_LIMIT`** — you've hit the per-minute cap above. Only fix: wait.
- **`API_ERROR: ...experiencing high demand...`** — Gemini's own servers being temporarily overloaded, unrelated to your usage. `llm_client.py` already retries this automatically (twice, with a short pause) before ever surfacing it to you — if you still see it, Gemini itself was down for a few seconds longer than that.

## Running the automated tests
```
pytest
```
Fifteen tests are included now, covering everything from Phases 2-5: the server boot, the missing-API-key error path, that something mentioned earlier gets correctly recalled later through memory search, that two different accounts' memories never mix, that both voice endpoints return well-formed results (the speech test actually decodes the returned audio as a real WAV file, not just checking for a plausible-looking string), that emotion tagging costs zero extra API calls (one test literally counts how many times the model gets called for a single message and asserts it's exactly one), and that a transient 503 gets retried while a 429 fails fast. All fifteen were passing before this project was handed to you.

## Docker (optional — not required to keep developing day to day)

A `Dockerfile` is included and ready, packaging this exact app. It couldn't be test-built in the environment that generated this project (no access to Docker Hub there), so it's worth trying once yourself. If you want to:
1. Install **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**
2. From this `backend` folder:
```
docker build -t companion-backend .
docker run -p 8080:8080 --env-file .env companion-backend
```

This matters once you're ready to deploy (later roadmap phases) — for daily development, plain `uvicorn` above is all you need.

**If you've already tried this:** stop the container when you're done testing it, so it doesn't sit running in the background competing with your local `uvicorn` on the same port 8080 (confusing, intermittent-looking bugs — like requests randomly hitting an older build of the code — are the usual symptom). Check what's running and stop it:
```
docker ps
docker stop <container id from the list above>
```
Also worth knowing: stopping it with Ctrl+C in an attached terminal used to require Docker to force-kill it after a few tries (`got 3 SIGTERM/SIGINTs, forcefully exiting`) - that was a real bug in the Dockerfile's shutdown handling (a shell-form `CMD` wasn't forwarding the stop signal to the actual server process), now fixed. If you built the image before this fix, rebuild it (`docker build -t companion-backend .` again) to pick up the corrected version.

## Troubleshooting

- **`ModuleNotFoundError` for something like `fastapi`** — you forgot to activate the virtual environment in this terminal (Step 1), or forgot Step 2's `pip install`.
- **Frontend shows "NETWORK_ERROR: Could not reach the backend"** — this server isn't running, or crashed. Check this terminal window for a red error message.
- **Every message gives "MISSING_API_KEY"** — check `.env` (not `.env.example`) exists here with your real key, then stop this server (Ctrl+C) and run `uvicorn` again — it only reads `.env` on startup.
- **`CORS` error in the browser console** — check `CORS_ORIGINS` in `.env` includes whatever URL the frontend is actually running on.
- **A message takes forever then still fails, or the server log mentions "SHA256 hash" / "onnx" / "Corrupted download"** — Chroma's one-time embedding model download got interrupted or blocked (a flaky connection, a firewall, or antivirus scanning it mid-download are the usual causes). The good news: this was specifically designed to fail *safely* — you should just see a normal reply with no long-term recall for that one message, not a crash. To fix it properly, delete the partial download and let it retry: stop the server, delete the folder shown in the error path (something like `~/.cache/chroma/onnx_models`), and restart `uvicorn`.
- **Alembic says something like "table already exists"** — you likely ran an older setup already. Delete `companion.db` (or, on Neon, drop the two tables via the Neon SQL editor) and run `alembic upgrade head` again for a clean start — you'll lose emotion tags and the evolving summary, not your actual conversation, which lives in Firestore, not here.
- **Switched to Neon and now nothing works** — double check you used the **pooled** connection string (has `-pooler` in it) for `DATABASE_URL` and the **direct** one for `DATABASE_URL_UNPOOLED` — swapping them, or using the same one for both, is the most common mistake here.
