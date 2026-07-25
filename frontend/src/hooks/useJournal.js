// useJournal.js
//
// Manages journal entries and saved quotes - same shape, distinguished
// by `type`. Encryption follows the exact same pattern as chat messages.

import { useState, useEffect, useCallback } from 'react';
import { encryptText, decryptText } from '../services/crypto';
import { loadJournalEntries, saveJournalEntry, deleteJournalEntry } from '../services/firestoreJournal';
import { indexJournalEntry } from '../services/apiClient';

export function useJournal(uid, cryptoKey) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid || !cryptoKey) return;
    (async () => {
      setLoading(true);
      const rows = await loadJournalEntries(uid);
      const decrypted = await Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          type: row.type,
          timestamp: row.timestamp,
          text: await decryptText(cryptoKey, row.contentEncrypted),
        }))
      );
      setEntries(decrypted);
      setLoading(false);
    })();
  }, [uid, cryptoKey]);

  const addEntry = useCallback(
    async (text, type = 'entry') => {
      if (!text.trim() || !cryptoKey || !uid) return;
      setError('');
      try {
        const timestamp = Date.now();
        const contentEncrypted = await encryptText(cryptoKey, text.trim());
        const id = await saveJournalEntry(uid, { type, contentEncrypted, timestamp });
        setEntries((prev) => [{ id, type, timestamp, text: text.trim() }, ...prev]);
        // Fire-and-forget: the entry above is already saved regardless of this succeeding.
        indexJournalEntry(uid, id, text.trim(), type);
      } catch (err) {
        setError(err.message || 'Could not save that entry.');
      }
    },
    [uid, cryptoKey]
  );

  const removeEntry = useCallback(
    async (id) => {
      await deleteJournalEntry(uid, id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [uid]
  );

  return { entries, loading, error, addEntry, removeEntry };
}
