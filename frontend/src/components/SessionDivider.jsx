export default function SessionDivider({ timestamp, isLatest }) {
  const date = new Date(timestamp);
  const label = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center gap-3 my-6 px-1" role="separator" aria-label={label}>
      <div className={`h-px flex-1 bg-gradient-to-r from-transparent to-calm/40 ${isLatest ? 'divider-glow' : ''}`} />
      <span className="font-display text-xs tracking-widest uppercase text-calm/90 whitespace-nowrap">{label}</span>
      <div className={`h-px flex-1 bg-gradient-to-l from-transparent to-calm/40 ${isLatest ? 'divider-glow' : ''}`} />
    </div>
  );
}
