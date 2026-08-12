// EmotionalHook.jsx
const PHRASES = [
  { text: 'Frustrations', tone: 'warm' },
  { text: 'Regrets', tone: 'calm' },
  { text: 'Confessions', tone: 'warm' },
  { text: 'Obsessions', tone: 'calm' },
  { text: 'Stories', tone: 'warm' },
  { text: 'Promises', tone: 'calm' },
];

export default function EmotionalHook() {
  return (
    <div className="mb-7">
      <p className="text-[13px] tracking-widest uppercase text-calm font-medium mb-2">Your pocket person</p>
      <h2 className="font-display text-2xl text-cream leading-snug mb-4">
        Some things are easier<br />to tell a stranger.
      </h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {PHRASES.map((p, i) => (
          <span
            key={p.text}
            className={`cloud-chip inline-block px-3.5 py-1.5 rounded-full text-[13px] font-medium ${
              p.tone === 'warm' ? 'bg-warm/15 text-warm' : 'bg-calm/15 text-calm'
            }`}
            style={{ animationDelay: `${i * 0.4}s` }}
          >
            {p.text}
          </span>
        ))}
      </div>
      <p className="text-sm text-muted leading-relaxed">
        No judgement. No history with you. Nowhere else it goes. Just say it — Bestie's listening.
      </p>
      <style>{`
        @keyframes float-cloud { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        .cloud-chip { animation: float-cloud 3.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cloud-chip { animation: none; } }
      `}</style>
    </div>
  );
}