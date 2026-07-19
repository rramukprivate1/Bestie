// useChat.js
//
// Owns the single continuous message stream. As of Phase 4, Firestore is
// the source of truth (via firestoreMessages.js) instead of IndexedDB -
// messages are still individually encrypted exactly as before, Firestore
// just never sees anything but ciphertext. Session-divider logic,
// pinning, and regenerate are otherwise unchanged from Phase 1-3.

import { useState, useEffect, useCallback, useRef } from 'react';
import { encryptText, decryptText } from '../services/crypto';
import { sendMessage as apiSend } from '../services/apiClient';
import { loadAllMessages, saveMessage, deleteMessage, setMessagePinned } from '../services/firestoreMessages';

const SESSION_GAP_MS = 3 * 60 * 60 * 1000; // new session after a 3-hour gap
const RECENT_TURNS_FOR_CONTEXT = 24; // how many past turns get sent to Gemini each time

function computeSessionId(prevTimestamp, prevSessionId) {
  const now = Date.now();
  if (!prevTimestamp) return `s-${now}`;
  const gap = now - prevTimestamp;
  const sameDay = new Date(now).toDateString() === new Date(prevTimestamp).toDateString();
  if (gap > SESSION_GAP_MS || !sameDay) return `s-${now}`;
  return prevSessionId;
}

export function useChat(uid, cryptoKey, profileSummary) {
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);

  const lastSessionRef = useRef(null);
  const lastTimestampRef = useRef(null);

  useEffect(() => {
    if (!uid || !cryptoKey) return;
    (async () => {
      setLoadingHistory(true);
      const rows = await loadAllMessages(uid);
      const decrypted = await Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          role: row.role,
          sessionId: row.sessionId,
          timestamp: row.timestamp,
          pinned: !!row.pinned,
          text: await decryptText(cryptoKey, row.contentEncrypted),
        }))
      );
      setMessages(decrypted);
      if (decrypted.length > 0) {
        const last = decrypted[decrypted.length - 1];
        lastTimestampRef.current = last.timestamp;
        lastSessionRef.current = last.sessionId;
      }
      setLoadingHistory(false);
    })();
  }, [uid, cryptoKey]);

  const persistMessage = useCallback(
    async (role, text, sessionId) => {
      const contentEncrypted = await encryptText(cryptoKey, text);
      const timestamp = Date.now();
      const id = await saveMessage(uid, { role, sessionId, timestamp, contentEncrypted });
      return { id, role, text, sessionId, timestamp, pinned: false };
    },
    [uid, cryptoKey]
  );

  const sendUserMessage = useCallback(
    async (text) => {
      if (!text.trim() || !cryptoKey || sending) return;
      setError('');

      const sessionId = computeSessionId(lastTimestampRef.current, lastSessionRef.current);
      lastSessionRef.current = sessionId;

      const userMsg = await persistMessage('user', text.trim(), sessionId);
      lastTimestampRef.current = userMsg.timestamp;
      setMessages((prev) => [...prev, userMsg]);

      setSending(true);
      try {
        const pinnedMemories = messages.filter((m) => m.pinned).map((m) => ({ id: m.id, text: m.text }));
        const history = messages.slice(-RECENT_TURNS_FOR_CONTEXT).map((m) => ({
          id: m.id,
          role: m.role === 'assistant' ? 'model' : 'user',
          text: m.text,
        }));

        const replyText = await apiSend({
          userId: uid,
          messageId: userMsg.id,
          messageCount: messages.length,
          profileSummary,
          pinnedMemories,
          history,
          message: text.trim(),
        });

        const assistantMsg = await persistMessage('assistant', replyText, sessionId);
        lastTimestampRef.current = assistantMsg.timestamp;
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        setError(err.message || 'Something went wrong.');
      } finally {
        setSending(false);
      }
    },
    [uid, cryptoKey, messages, profileSummary, persistMessage, sending]
  );

  const regenerateLastReply = useCallback(async () => {
    if (sending || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return;

    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;

    setSending(true);
    setError('');
    try {
      await deleteMessage(uid, last.id);
      const historyBase = messages.slice(0, -1);
      setMessages(historyBase);

      const pinnedMemories = historyBase.filter((m) => m.pinned).map((m) => ({ id: m.id, text: m.text }));
      const history = historyBase
        .slice(0, -1)
        .slice(-RECENT_TURNS_FOR_CONTEXT)
        .map((m) => ({ id: m.id, role: m.role === 'assistant' ? 'model' : 'user', text: m.text }));

      const replyText = await apiSend({
        userId: uid,
        messageId: lastUser.id,
        messageCount: historyBase.length,
        profileSummary,
        pinnedMemories,
        history,
        message: lastUser.text,
        temperature: 0.95,
      });

      const assistantMsg = await persistMessage('assistant', replyText, last.sessionId);
      lastTimestampRef.current = assistantMsg.timestamp;
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSending(false);
    }
  }, [uid, messages, profileSummary, sending, persistMessage]);

  const togglePin = useCallback(
    async (id) => {
      const msg = messages.find((m) => m.id === id);
      if (!msg) return;
      const newPinned = !msg.pinned;
      await setMessagePinned(uid, id, newPinned);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pinned: newPinned } : m)));
    },
    [uid, messages]
  );

  return { messages, sending, error, loadingHistory, sendUserMessage, regenerateLastReply, togglePin };
}
