// apiClient.js
//
// Replaces geminiClient.js from Phase 1. The frontend no longer talks to
// Gemini directly or holds any API key — it just calls our own backend,
// which does the actual LLM call server-side.

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * @param {Object} args
 * @param {string} args.userId - the signed-in Firebase user's uid, used by the backend to keep each account's memory separate
 * @param {string} args.messageId - this message's stable id from Firestore, used by the backend to index it for future recall
 * @param {number} args.messageCount - how many messages exist so far, used to time the periodic memory-summary refresh
 * @param {string} args.profileSummary
 * @param {Array<{id: string, text: string}>} args.pinnedMemories
 * @param {Array<{id: string, role: 'user'|'model', text: string}>} args.history
 * @param {string} args.message
 * @param {number} [args.temperature]
 * @returns {Promise<string>} the assistant's reply text
 */
export async function sendMessage({
  userId,
  messageId,
  messageCount,
  profileSummary,
  pinnedMemories,
  history,
  message,
  temperature = 0.85,
}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        message_id: messageId,
        message_count: messageCount,
        profile_summary: profileSummary,
        pinned_memories: pinnedMemories,
        history,
        message,
        temperature,
      }),
    });
  } catch (networkErr) {
    throw new Error(
      `NETWORK_ERROR: Could not reach the backend at ${API_BASE} — is it running? (see backend/README.md)`
    );
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.detail || `Request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.reply;
}

/** Fetches day-by-day emotion data for the Insights view's mood strip. */
export async function getMoodSummary(userId, days = 14) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${API_BASE}/mood-summary?user_id=${encodeURIComponent(userId)}&days=${days}`);
      if (!response.ok) throw new Error(`Could not load mood history (status ${response.status})`);
      const data = await response.json();
      return data.days;
    } catch (err) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 2000)); // give a cold container a moment
        continue;
      }
      throw err;
    }
  }
}

/** Embeds a journal entry or saved quote into memory so it can come up naturally in conversation. */
export async function indexJournalEntry(userId, entryId, text, entryType = 'entry') {
  try {
    await fetch(`${API_BASE}/index-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, entry_id: entryId, text, entry_type: entryType }),
    });
  } catch {
    // Best-effort - the entry is already safely saved in Firestore by the
    // time this runs, so a failed index here just means it won't come up
    // in conversation on its own, not that anything was lost.
  }
}
