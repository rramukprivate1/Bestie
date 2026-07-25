import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookHeart, Quote, Trash2, Loader2 } from 'lucide-react';

export default function JournalView({ journal }) {
  const { entries, loading, error, addEntry, removeEntry } = journal;
  const [text, setText] = useState('');
  const [type, setType] = useState('entry');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    await addEntry(text, type);
    setText('');
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col bg-deep">
      <header className="px-4 py-3 border-b border-surface shrink-0">
        <span className="font-display text-lg text-cream">Journal</span>
      </header>

      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4">
        {/* Entry form */}
        <div className="bg-surface rounded-2xl p-3 mb-5">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setType('entry')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${
                type === 'entry' ? 'bg-warm text-deep' : 'text-muted'
              }`}
            >
              <BookHeart size={12} /> Journal entry
            </button>
            <button
              onClick={() => setType('quote')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${
                type === 'quote' ? 'bg-calm text-deep' : 'text-muted'
              }`}
            >
              <Quote size={12} /> Save a quote
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={type === 'quote' ? 2 : 4}
            placeholder={
              type === 'quote'
                ? 'A quote, line from a book, or reflection worth keeping…'
                : "What's on your mind today?"
            }
            className="w-full bg-transparent text-cream text-sm resize-none outline-none placeholder:text-muted/50 leading-relaxed"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSave}
              disabled={!text.trim() || saving}
              className="bg-warm text-deep text-sm font-medium rounded-xl px-4 py-1.5 disabled:opacity-40 transition-opacity"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {error && <p className="text-warm text-xs mb-3 px-1">{error}</p>}

        {/* Entry list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={16} className="animate-spin text-muted" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-muted text-sm text-center py-8 px-6 leading-relaxed">
            Nothing here yet. Entries and quotes you save become part of what it remembers, too.
          </p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-surface rounded-xl p-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted/70 mb-1">
                      {entry.type === 'quote' ? <Quote size={11} /> : <BookHeart size={11} />}
                      {new Date(entry.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity shrink-0"
                      aria-label="Delete entry"
                    >
                      <Trash2 size={13} className="text-muted" />
                    </button>
                  </div>
                  <p
                    className={`text-sm text-cream leading-relaxed whitespace-pre-wrap ${
                      entry.type === 'quote' ? 'italic' : ''
                    }`}
                  >
                    {entry.text}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
