import { useState, useEffect } from 'react';
import { Pin, BookHeart, Quote, Loader2 } from 'lucide-react';
import MoodStrip from './MoodStrip';
import { getMoodSummary } from '../services/apiClient';

export default function InsightsView({ uid, messages, journalEntries }) {
  const [moodDays, setMoodDays] = useState(null);
  const [moodError, setMoodError] = useState('');

  useEffect(() => {
    if (!uid) return;
    getMoodSummary(uid, 14)
      .then(setMoodDays)
      .catch((err) => setMoodError(err.message || 'Could not load mood history.'));
  }, [uid]);

  const pinnedMessages = messages.filter((m) => m.pinned).map((m) => ({
    id: `msg-${m.id}`,
    kind: 'pinned',
    text: m.text,
    timestamp: m.timestamp,
  }));
  const journalHighlights = journalEntries.map((e) => ({
    id: `journal-${e.id}`,
    kind: e.type,
    text: e.text,
    timestamp: e.timestamp,
  }));
  const highlights = [...pinnedMessages, ...journalHighlights].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="h-full flex flex-col bg-deep">
      <header className="px-4 py-3 border-b border-surface shrink-0">
        <span className="font-display text-lg text-cream">Insights</span>
      </header>

      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4">
        <section className="mb-6">
          <h2 className="font-display text-sm text-calm mb-3 tracking-wide">Last 14 days</h2>
          {moodError ? (
            <p className="text-warm text-xs">{moodError}</p>
          ) : moodDays === null ? (
            <div className="flex justify-center py-4">
              <Loader2 size={16} className="animate-spin text-muted" />
            </div>
          ) : (
            <MoodStrip days={moodDays} />
          )}
        </section>

        <section>
          <h2 className="font-display text-sm text-calm mb-3 tracking-wide">Highlights</h2>
          {highlights.length === 0 ? (
            <p className="text-muted text-sm leading-relaxed px-1">
              Pin a message in chat, or save a journal entry — they'll show up here as a timeline you can look back
              on.
            </p>
          ) : (
            <div className="space-y-2">
              {highlights.map((h) => (
                <div key={h.id} className="bg-surface rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted/70 mb-1">
                    {h.kind === 'pinned' && <Pin size={11} />}
                    {h.kind === 'entry' && <BookHeart size={11} />}
                    {h.kind === 'quote' && <Quote size={11} />}
                    {new Date(h.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <p className={`text-sm text-cream leading-relaxed ${h.kind === 'quote' ? 'italic' : ''}`}>
                    {h.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
