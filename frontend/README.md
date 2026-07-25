# Companion Frontend (Phase 6)

The React PWA. As of Phase 4, this uses **real accounts** (Firebase Auth) instead of a local PIN, and your data now lives in **Firestore** instead of only on this device. As of Phase 5, the mic button and each reply's speaker icon are **real** — voice in, voice out, both via Gemini rather than your browser's built-in (often robotic) text-to-speech. As of Phase 6, there are two more tabs at the bottom: **Journal** and **Insights**.

---

## 1. Set up a Firebase project (one-time, ~5 minutes)

1. Go to **[console.firebase.google.com](https://console.firebase.google.com)**, sign in with any Google account.
2. Click **Create a project** (or **Add project**). Give it any name. You can skip/disable Google Analytics when asked — not needed here.
3. Once it's created, click the **`</>`** (web) icon to register a web app. Give it any nickname, click **Register app**.
4. Firebase shows you a `firebaseConfig` object with values like `apiKey`, `authDomain`, `projectId`, etc. Keep this tab open — you'll paste these into `.env` in Step 3 below.
5. In the left sidebar: **Build → Authentication → Get started**. Click **Email/Password** in the sign-in providers list, toggle it **Enabled**, click **Save**.
6. In the left sidebar: **Build → Firestore Database → Create database**. Pick any location close to you, and choose **Start in production mode** (we're providing our own security rules, not using the wide-open test-mode default).

## 2. Apply the security rules (important — don't skip)

Without this step, Firestore's production-mode default blocks *everyone*, including you. In the Firebase Console: **Build → Firestore Database → Rules** tab. Replace whatever's there with the contents of `firestore.rules` (included in this project), then click **Publish**.

This is what actually enforces that your account can only ever read or write your own data — worth understanding, not just pasting blindly:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /messages/{messageId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## 3. Add your Firebase config

Copy `.env.example` to `.env` in this folder. Fill in the six `VITE_FIREBASE_*` values from Step 1.4 above, and keep `VITE_API_BASE_URL` pointing at your backend as before.

## 4. Install and run

```
npm install
npm run dev
```
Make sure the backend (`../backend`) is already running in another terminal — see its README for the Phase 4 setup it needs too (Neon is optional; SQLite still works fine).

## Testing voice doesn't actually need your phone

Your computer has a microphone and speakers too, and `http://localhost:5173` already satisfies the browser's secure-context requirement — no HTTPS, no phone, no extra setup at all. With `npm run dev` and the backend both running, just open the app in Chrome/Edge on your computer and try the mic and speaker icons directly there. This is the fastest way to confirm voice actually works before worrying about phone testing at all.

## Getting the full app on your phone

The local self-signed HTTPS approach (`npm run dev:https`) turned out to be unreliable in practice — too many Windows-specific failure points (firewall rules, certificate trust, network profile settings) to be worth chasing further. **Deploying to Vercel is the one path confirmed to actually work**, so that's the only one documented here now.

**1. Push this project to GitHub**, if you haven't already:
```
cd companion-app
git init
git add .
git commit -m "Initial commit"
```
Create an empty repository at [github.com/new](https://github.com/new) (don't add a README/gitignore there — you already have one), then:
```
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

**2. Deploy the frontend to Vercel:**
```
cd frontend
npm install -g vercel
vercel
```
Answer its prompts (defaults are fine), log in via the browser when asked (free, no card). A couple of minutes later you get a real `https://your-project.vercel.app` link.

**3. Add your real Firebase env vars to Vercel** — it doesn't read your local `.env` file. Either run `vercel env add` for each `VITE_FIREBASE_*` variable, or add them via the Vercel dashboard (Project → Settings → Environment Variables).

**4. Add the Vercel domain to Firebase**: Authentication → Settings → Authorized domains, add `your-project.vercel.app`.

**5. The part that's easy to miss: your backend still isn't reachable from the internet.** Your Vercel-hosted frontend runs *in the browser on your phone* — `VITE_API_BASE_URL=http://localhost:8080` means "the phone's own localhost," which is empty and will never reach your PC. You'll see `NETWORK_ERROR: Could not reach the backend` until this is fixed. Two options:

- **For a quick testing session** (URL changes every time you restart it — fine for trying things out, not for daily use): install [ngrok](https://ngrok.com/download), sign up free, then:
  ```
  ngrok config add-authtoken YOUR_TOKEN
  ngrok http 8080
  ```
  It prints a `https://something.ngrok-free.app` URL forwarding to your local backend. Set that as `VITE_API_BASE_URL` in Vercel's dashboard, then `vercel --prod` to redeploy with it applied (Vite bakes env vars in at build time, so a redeploy is needed every time this URL changes — including every time you restart ngrok).
- **For something permanent:** `backend/README.md`'s "Deploying to Cloud Run" section walks through this exactly — no restart-churn, a stable URL you set once, and GitHub Actions redeploys it automatically from then on. Worth doing whenever you're ready to stop treating the backend as "only runs on my PC."

Once the frontend can reach a reachable backend, open the Vercel link on your phone and **Add to Home Screen** — no certificate warnings, works from anywhere, not just home WiFi.

---

## What changed about login

- **Sign up** with an email + password instead of a PIN. That password now does two jobs: Firebase uses it to verify it's you, and — entirely separately, on your device only — it's also used to derive the same encryption key your messages have always been locked with. Firebase's own servers never see that derived key or your message content, only the password itself, exactly like any normal account system.
- **There is still no recovery if you forget it.** Firebase does support password-reset emails, but resetting the password there would *not* recover your encryption key, since the key is derived from the old one. This is a real, known gap — worth knowing rather than discovering the hard way.
- **Your Phase 1-3 local test data doesn't automatically carry over.** It lived in a different storage system (IndexedDB) under a different secret (your old PIN). Rather than ship an untested automatic-migration script for something as sensitive as your own message history, this is a deliberate stop: if you specifically want to bring old local test data forward, ask and we can do it carefully, rather than risk it silently as part of a bigger change.

## Using voice

**To speak a message:** tap the mic icon in the input bar. It turns solid while recording — tap it again to stop. The transcribed text appears in the input box for you to review (and edit, if anything came out wrong) before sending, exactly like typing.

**To hear a reply:** tap the small speaker icon under any assistant message. Or, toggle voice mode (the speaker icon in the header) to have every new reply play automatically — genuinely hands-free conversation.

The first time you tap the mic, your browser will ask for microphone permission — this is normal and only asked once per browser.

## Journal and Insights

Two new tabs at the bottom of the screen:

- **Journal** — write a free-form entry, or save a quote/reflection you want to keep. Both are encrypted exactly like chat messages, and both quietly become part of what the assistant can draw on in conversation (via the same memory search chat uses) — mention something you journaled weeks ago, and it can genuinely come back up.
- **Insights** — a 14-day mood strip (color reflects your dominant tracked emotion each day — not a "good/bad" scale, just a way to see patterns) plus a running timeline of everything you've pinned in chat or saved in your journal, newest first.

## What's actually built so far (Phases 1-6)

- Real accounts (Firebase Auth), syncing the same memory across devices
- Every message still individually encrypted before Firestore ever sees it
- One continuous chat with session dividers, timestamps, pinned messages, an evolving profile, and a "try a different reply" button
- Real voice in and out via Gemini, not the browser's built-in TTS
- A journal for entries and saved quotes, both feeding back into memory
- A mood strip and pinned/journal highlights timeline (the Insights tab)
- The backend (Phases 2-3) does real long-term memory: semantic search over everything you've said, an auto-evolving summary, per-message emotion tagging
- Firestore's own offline cache keeps things working through brief connectivity drops

## What's deliberately not here yet

- **Real-time sync if you're logged in on two devices at once** — each device loads its own snapshot on open; this is "the same memory follows you," not "simultaneous live collaboration," which is a different, larger feature
- **A voice picker** — the backend defaults to one Gemini voice ("Kore"); trying others just means changing one default value in `backend/app/services/voice_client.py` for now, not yet a UI setting
- **Editing a journal entry** — you can delete and re-add one, but there's no in-place edit yet

## Troubleshooting

- **"Missing or insufficient permissions" from Firestore** — you skipped or mistyped Step 2 (the security rules). Go re-check the Rules tab.
- **Sign-up fails immediately** — confirm Email/Password is actually toggled on in Authentication → Sign-in method (Step 1.5).
- **"NETWORK_ERROR: Could not reach the backend..."** — either the backend isn't running (see `../backend/README.md`), or you're on the Vercel-deployed app and `VITE_API_BASE_URL` still points at `localhost` (see "Getting the full app on your phone" above — step 5 specifically).
- **"Cannot read properties of undefined (reading 'importKey')"** — the page loaded over a plain, non-localhost `http://` address (a LAN IP, most likely). Test on `http://localhost:5173` on your computer, or use the Vercel deployment for your phone — see the sections above.
- **Recording stops immediately / no transcription happens** — check the backend terminal for the actual error; the most common cause is the same `MISSING_API_KEY` issue from earlier phases.
- **`npm install` fails** — run `node -v`; if it's below `v18`, reinstall Node from nodejs.org.
