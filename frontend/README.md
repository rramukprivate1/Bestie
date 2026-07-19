# Companion Frontend (Phase 5)

The React PWA. As of Phase 4, this uses **real accounts** (Firebase Auth) instead of a local PIN, and your data now lives in **Firestore** instead of only on this device. As of Phase 5, the mic button and each reply's speaker icon are **real** — voice in, voice out, both via Gemini rather than your browser's built-in (often robotic) text-to-speech.

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

## Getting it on your phone (read this if you've hit "Cannot read properties of undefined (reading 'importKey')")

That error means the browser has disabled the Web Crypto API entirely, which happens on any plain `http://` address that isn't `localhost` itself — including a LAN IP like `http://192.168.x.x:5173` from the "same WiFi" method used in earlier phases. It's a browser security rule, not a bug to work around in the usual sense; you need either a real `https://` URL, or a self-signed one.

### Option A — quick, stays local
```
npm run dev:https
```
This prints an `https://192.168.x.x:5173`-style Network URL. Open it on your phone — you'll see a certificate warning (it's self-signed), tap through it ("Advanced → Proceed"). Then, in the Firebase Console: **Build → Authentication → Settings → Authorized domains → Add domain**, and add that IP. Repeat any time your computer's IP changes (e.g., after reconnecting to WiFi).

### Option B — recommended, a real link that works anywhere, and doubles as Git/GitHub practice

This is worth doing anyway at some point, so if you want the practice, do it now:

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

**3. Add your real Gemini/Firebase env vars to Vercel** — it doesn't read your local `.env` file. Either run `vercel env add` for each `VITE_*` variable from your `.env`, or add them via the Vercel dashboard (Project → Settings → Environment Variables), then `vercel --prod` to redeploy with them applied.

**4. Add the Vercel domain to Firebase** — same place as Option A (Authentication → Settings → Authorized domains), add `your-project.vercel.app`.

Open that `vercel.app` link on your phone, **Add to Home Screen** — no certificate warnings, works from anywhere, not just home WiFi.

---

## What changed about login

- **Sign up** with an email + password instead of a PIN. That password now does two jobs: Firebase uses it to verify it's you, and — entirely separately, on your device only — it's also used to derive the same encryption key your messages have always been locked with. Firebase's own servers never see that derived key or your message content, only the password itself, exactly like any normal account system.
- **There is still no recovery if you forget it.** Firebase does support password-reset emails, but resetting the password there would *not* recover your encryption key, since the key is derived from the old one. This is a real, known gap — worth knowing rather than discovering the hard way.
- **Your Phase 1-3 local test data doesn't automatically carry over.** It lived in a different storage system (IndexedDB) under a different secret (your old PIN). Rather than ship an untested automatic-migration script for something as sensitive as your own message history, this is a deliberate stop: if you specifically want to bring old local test data forward, ask and we can do it carefully, rather than risk it silently as part of a bigger change.

## Using voice

**To speak a message:** tap the mic icon in the input bar. It turns solid while recording — tap it again to stop. The transcribed text appears in the input box for you to review (and edit, if anything came out wrong) before sending, exactly like typing.

**To hear a reply:** tap the small speaker icon under any assistant message. Or, toggle voice mode (the speaker icon in the header) to have every new reply play automatically — genuinely hands-free conversation.

The first time you tap the mic, your browser will ask for microphone permission — this is normal and only asked once per browser.

## What's actually built so far (Phases 1-5)

- Real accounts (Firebase Auth), syncing the same memory across devices
- Every message still individually encrypted before Firestore ever sees it
- One continuous chat with session dividers, timestamps, pinned messages, an evolving profile, and a "try a different reply" button
- Real voice in and out via Gemini, not the browser's built-in TTS
- The backend (Phases 2-3) does real long-term memory: semantic search over everything you've said, an auto-evolving summary, per-message emotion tagging
- Firestore's own offline cache keeps things working through brief connectivity drops

## What's deliberately not here yet

- **A visible mood dashboard** (Phase 6) — the emotion data is being collected already, just not shown yet
- **Real-time sync if you're logged in on two devices at once** — each device loads its own snapshot on open; this is "the same memory follows you," not "simultaneous live collaboration," which is a different, larger feature
- **A voice picker** — the backend defaults to one Gemini voice ("Kore"); trying others just means changing one default value in `backend/app/services/voice_client.py` for now, not yet a UI setting

## Troubleshooting

- **"Missing or insufficient permissions" from Firestore** — you skipped or mistyped Step 2 (the security rules). Go re-check the Rules tab.
- **Sign-up fails immediately** — confirm Email/Password is actually toggled on in Authentication → Sign-in method (Step 1.5).
- **"NETWORK_ERROR: Could not reach the backend..."** — the backend isn't running; see `../backend/README.md`.
- **"Microphone access was blocked or unavailable" / "Cannot read properties of undefined (reading 'importKey')"** — see "Getting it on your phone" above; both come from the same root cause (an insecure, non-localhost address).
- **Recording stops immediately / no transcription happens** — check the backend terminal for the actual error; the most common cause is the same `MISSING_API_KEY` issue from earlier phases.
- **`npm install` fails** — run `node -v`; if it's below `v18`, reinstall Node from nodejs.org.
